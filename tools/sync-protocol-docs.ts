import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_PROTOCOL_SOURCE_URL = "https://modelcontextprotocol.io/llms.txt";
export const DEFAULT_PROTOCOL_OUTPUT_DIR = path.resolve(process.cwd(), "docs/protocol");

const MCP_ORIGIN = "https://modelcontextprotocol.io";
const CORE_PATH_PREFIXES = ["/docs/", "/specification/"] as const;

export interface ProtocolDocRecord {
  readonly sourceUrl: string;
  readonly localPath: string;
  readonly sha256: string;
  readonly downloadedAt: string;
}

export interface SyncFailure {
  readonly url: string;
  readonly reason: string;
  readonly status?: number;
}

export interface SyncResult {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly failures: readonly SyncFailure[];
  readonly records: readonly ProtocolDocRecord[];
  readonly outputDir: string;
  readonly manifestPath: string;
  readonly indexPath: string;
}

export interface SyncProtocolDocsOptions {
  readonly outputDir?: string;
  readonly sourceUrl?: string;
  readonly concurrency?: number;
  readonly retries?: number;
  readonly fetchImpl?: FetchLike;
  readonly now?: () => Date;
}

export interface CliLogSink {
  write(message: string): void;
}

export interface RunSyncCliDependencies {
  readonly fetchImpl?: FetchLike;
  readonly now?: () => Date;
  readonly stdout?: CliLogSink;
  readonly stderr?: CliLogSink;
}

interface ProtocolManifest {
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly records: readonly ProtocolDocRecord[];
  readonly failures: readonly SyncFailure[];
}

interface ParsedCliArgs {
  readonly outputDir?: string;
  readonly sourceUrl?: string;
  readonly concurrency?: number;
  readonly retries?: number;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

class ProtocolHttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number, statusText: string) {
    super(`HTTP ${status} for ${url}${statusText ? ` (${statusText})` : ""}`);
    this.name = "ProtocolHttpError";
    this.url = url;
    this.status = status;
  }
}

export function extractMarkdownLinks(markdown: string): string[] {
  const regex = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;
  const links: string[] = [];
  for (const match of markdown.matchAll(regex)) {
    const link = match[1];
    if (typeof link === "string") {
      links.push(link);
    }
  }
  return links;
}

export function normalizeProtocolUrls(inputUrls: readonly string[]): string[] {
  const normalized = new Set<string>();

  for (const inputUrl of inputUrls) {
    const candidate = normalizeProtocolUrl(inputUrl);
    if (candidate !== null) {
      normalized.add(candidate);
    }
  }

  return Array.from(normalized).sort((left, right) => left.localeCompare(right));
}

export function urlToLocalPath(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);
  let normalizedPath = parsed.pathname;
  if (!normalizedPath.endsWith(".md")) {
    normalizedPath = appendMarkdownExtension(normalizedPath);
  }
  return normalizedPath.replace(/^\/+/, "");
}

export function buildIndexMarkdown(
  records: readonly ProtocolDocRecord[],
  generatedAt: string,
  sourceUrl: string
): string {
  const grouped = new Map<string, string[]>();
  const sortedRecords = [...records].sort((left, right) => left.localPath.localeCompare(right.localPath));

  for (const record of sortedRecords) {
    const root = record.localPath.split("/")[0] ?? "other";
    const current = grouped.get(root) ?? [];
    current.push(record.localPath);
    grouped.set(root, current);
  }

  const lines: string[] = [
    "# MCP Protocol Documentation",
    "",
    `- Generated at: ${generatedAt}`,
    `- Source index: ${sourceUrl}`,
    ""
  ];

  for (const root of Array.from(grouped.keys()).sort((left, right) => left.localeCompare(right))) {
    lines.push(`## ${root}`);
    lines.push("");
    const paths = grouped.get(root) ?? [];
    for (const localPath of paths) {
      lines.push(`- [${localPath}](./${localPath})`);
    }
    lines.push("");
  }

  if (records.length === 0) {
    lines.push("_No protocol pages were downloaded._");
    lines.push("");
  }

  return lines.join("\n");
}

export async function syncProtocolDocs(options: SyncProtocolDocsOptions = {}): Promise<SyncResult> {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_PROTOCOL_OUTPUT_DIR);
  const sourceUrl = options.sourceUrl ?? DEFAULT_PROTOCOL_SOURCE_URL;
  const concurrency = clampConcurrency(options.concurrency ?? 4);
  const retries = clampRetries(options.retries ?? 2);
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available.");
  }

  await mkdir(outputDir, { recursive: true });

  const sourceResponse = await fetchImpl(sourceUrl);
  if (!sourceResponse.ok) {
    throw new ProtocolHttpError(sourceUrl, sourceResponse.status, sourceResponse.statusText);
  }
  const sourceContent = await sourceResponse.text();
  const links = extractMarkdownLinks(sourceContent);
  const protocolUrls = normalizeProtocolUrls(links);

  const failures: SyncFailure[] = [];
  const records: ProtocolDocRecord[] = [];

  await runInPool(protocolUrls, concurrency, async (protocolUrl) => {
    try {
      const body = await downloadTextWithRetry({
        url: protocolUrl,
        fetchImpl,
        retries
      });
      const localPath = urlToLocalPath(protocolUrl);
      const absolutePath = path.join(outputDir, localPath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, body, "utf8");

      records.push({
        sourceUrl: protocolUrl,
        localPath,
        sha256: createHash("sha256").update(body).digest("hex"),
        downloadedAt: now().toISOString()
      });
    } catch (error: unknown) {
      const reason = toErrorMessage(error);
      if (error instanceof ProtocolHttpError) {
        failures.push({
          url: protocolUrl,
          reason,
          status: error.status
        });
      } else {
        failures.push({
          url: protocolUrl,
          reason
        });
      }
    }
  });

  const generatedAt = now().toISOString();
  const sortedRecords = records.sort((left, right) => left.localPath.localeCompare(right.localPath));
  const sortedFailures = failures.sort((left, right) => left.url.localeCompare(right.url));
  const manifest: ProtocolManifest = {
    sourceUrl,
    generatedAt,
    total: protocolUrls.length,
    succeeded: sortedRecords.length,
    failed: sortedFailures.length,
    records: sortedRecords,
    failures: sortedFailures
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const indexPath = path.join(outputDir, "index.md");
  await writeFile(indexPath, buildIndexMarkdown(sortedRecords, generatedAt, sourceUrl), "utf8");

  return {
    total: protocolUrls.length,
    succeeded: sortedRecords.length,
    failed: sortedFailures.length,
    failures: sortedFailures,
    records: sortedRecords,
    outputDir,
    manifestPath,
    indexPath
  };
}

export async function runSyncCli(
  argv: readonly string[],
  dependencies: RunSyncCliDependencies = {}
): Promise<number> {
  const stdout = dependencies.stdout ?? { write: (message: string) => process.stdout.write(message) };
  const stderr = dependencies.stderr ?? { write: (message: string) => process.stderr.write(message) };

  try {
    const parsedArgs = parseCliArgs(argv);
    const result = await syncProtocolDocs({
      ...(parsedArgs.outputDir !== undefined ? { outputDir: parsedArgs.outputDir } : {}),
      ...(parsedArgs.sourceUrl !== undefined ? { sourceUrl: parsedArgs.sourceUrl } : {}),
      ...(parsedArgs.concurrency !== undefined ? { concurrency: parsedArgs.concurrency } : {}),
      ...(parsedArgs.retries !== undefined ? { retries: parsedArgs.retries } : {}),
      ...(dependencies.fetchImpl !== undefined ? { fetchImpl: dependencies.fetchImpl } : {}),
      ...(dependencies.now !== undefined ? { now: dependencies.now } : {})
    });

    stdout.write(
      `Synced ${result.succeeded}/${result.total} documents into ${result.outputDir}. Failures: ${result.failed}.\n`
    );

    if (result.failed > 0) {
      stderr.write("Protocol sync completed with failures. See docs/protocol/manifest.json for details.\n");
      return 1;
    }

    return 0;
  } catch (error: unknown) {
    stderr.write(`Protocol sync failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}

function normalizeProtocolUrl(inputUrl: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(inputUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== MCP_ORIGIN) {
    return null;
  }

  if (!CORE_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))) {
    return null;
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = appendMarkdownExtension(parsed.pathname);

  return parsed.toString();
}

function appendMarkdownExtension(inputPath: string): string {
  let normalized = inputPath;
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.endsWith(".md")) {
    normalized = `${normalized}.md`;
  }
  return normalized;
}

function clampConcurrency(input: number): number {
  if (!Number.isFinite(input) || input < 1) {
    return 1;
  }
  return Math.floor(input);
}

function clampRetries(input: number): number {
  if (!Number.isFinite(input) || input < 0) {
    return 0;
  }
  return Math.floor(input);
}

async function downloadTextWithRetry(options: {
  readonly url: string;
  readonly fetchImpl: FetchLike;
  readonly retries: number;
}): Promise<string> {
  const totalAttempts = options.retries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const response = await options.fetchImpl(options.url);
      if (!response.ok) {
        throw new ProtocolHttpError(options.url, response.status, response.statusText);
      }
      return await response.text();
    } catch (error: unknown) {
      if (attempt >= totalAttempts) {
        throw error;
      }
      await sleep(150 * 2 ** (attempt - 1));
    }
  }

  throw new Error(`Failed to download ${options.url}`);
}

async function runInPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const poolSize = Math.min(concurrency, items.length);

  if (poolSize === 0) {
    return;
  }

  const runners = Array.from({ length: poolSize }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) {
        return;
      }
      const item = items[currentIndex];
      if (item === undefined) {
        return;
      }
      await worker(item);
    }
  });

  await Promise.all(runners);
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const parsed: {
    outputDir?: string;
    sourceUrl?: string;
    concurrency?: number;
    retries?: number;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--output") {
      parsed.outputDir = readArgValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--source") {
      parsed.sourceUrl = readArgValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--concurrency") {
      parsed.concurrency = parseNumberArg(readArgValue(argv, index, argument), argument);
      index += 1;
      continue;
    }
    if (argument === "--retries") {
      parsed.retries = parseNumberArg(readArgValue(argv, index, argument), argument);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return parsed;
}

function readArgValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseNumberArg(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${flag}: ${value}`);
  }
  return parsed;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function main(): Promise<void> {
  const exitCode = await runSyncCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === currentFilePath) {
  void main();
}
