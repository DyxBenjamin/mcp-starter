import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROTOCOL_SOURCE_URL,
  buildIndexMarkdown,
  extractMarkdownLinks,
  normalizeProtocolUrls,
  runSyncCli,
  syncProtocolDocs,
  urlToLocalPath
} from "../tools/sync-protocol-docs.js";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("sync-protocol-docs", () => {
  it("extracts markdown links from llms content", () => {
    const input = [
      "[Architecture](https://modelcontextprotocol.io/docs/learn/architecture.md)",
      "[Spec](https://modelcontextprotocol.io/specification/2025-06-18/index)",
      "[Ignored](https://example.com/docs/x.md)"
    ].join("\n");

    expect(extractMarkdownLinks(input)).toEqual([
      "https://modelcontextprotocol.io/docs/learn/architecture.md",
      "https://modelcontextprotocol.io/specification/2025-06-18/index",
      "https://example.com/docs/x.md"
    ]);
  });

  it("normalizes and filters only core protocol links", () => {
    const urls = [
      "https://modelcontextprotocol.io/docs/learn/architecture",
      "https://modelcontextprotocol.io/docs/learn/architecture#section",
      "https://modelcontextprotocol.io/specification/2025-06-18/index",
      "https://modelcontextprotocol.io/blog/post-1",
      "https://example.com/docs/learn/architecture"
    ];

    expect(normalizeProtocolUrls(urls)).toEqual([
      "https://modelcontextprotocol.io/docs/learn/architecture.md",
      "https://modelcontextprotocol.io/specification/2025-06-18/index.md"
    ]);
  });

  it("maps URL paths to deterministic local paths", () => {
    expect(urlToLocalPath("https://modelcontextprotocol.io/docs/learn/architecture")).toBe(
      "docs/learn/architecture.md"
    );
    expect(urlToLocalPath("https://modelcontextprotocol.io/specification/2025-06-18/index.md")).toBe(
      "specification/2025-06-18/index.md"
    );
  });

  it("builds grouped index markdown output", () => {
    const index = buildIndexMarkdown(
      [
        {
          sourceUrl: "https://modelcontextprotocol.io/specification/2025-06-18/index.md",
          localPath: "specification/2025-06-18/index.md",
          sha256: "x",
          downloadedAt: "2026-02-27T00:00:00.000Z"
        },
        {
          sourceUrl: "https://modelcontextprotocol.io/docs/learn/architecture.md",
          localPath: "docs/learn/architecture.md",
          sha256: "y",
          downloadedAt: "2026-02-27T00:00:00.000Z"
        }
      ],
      "2026-02-27T00:00:00.000Z",
      DEFAULT_PROTOCOL_SOURCE_URL
    );

    expect(index).toContain("## docs");
    expect(index).toContain("## specification");
    expect(index).toContain("[docs/learn/architecture.md](./docs/learn/architecture.md)");
  });

  it("syncs protocol docs, writes manifest and index", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "mcp-sync-success-"));
    const llmsBody = [
      "[Architecture](https://modelcontextprotocol.io/docs/learn/architecture)",
      "[Spec Index](https://modelcontextprotocol.io/specification/2025-06-18/index)"
    ].join("\n");

    const fetchMock: FetchLike = async (input) => {
      const url = resolveInputUrl(input);
      if (url === DEFAULT_PROTOCOL_SOURCE_URL) {
        return new Response(llmsBody, { status: 200 });
      }
      if (url === "https://modelcontextprotocol.io/docs/learn/architecture.md") {
        return new Response("# Architecture", { status: 200 });
      }
      if (url === "https://modelcontextprotocol.io/specification/2025-06-18/index.md") {
        return new Response("# Specification", { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    };

    const result = await syncProtocolDocs({
      outputDir,
      fetchImpl: fetchMock,
      now: () => new Date("2026-02-27T00:00:00.000Z"),
      retries: 0
    });

    expect(result.failed).toBe(0);
    expect(result.succeeded).toBe(2);

    const docContent = await readFile(path.join(outputDir, "docs/learn/architecture.md"), "utf8");
    expect(docContent).toBe("# Architecture");

    const manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8")) as {
      total: number;
      succeeded: number;
      failed: number;
      records: { localPath: string }[];
    };
    expect(manifest.total).toBe(2);
    expect(manifest.succeeded).toBe(2);
    expect(manifest.failed).toBe(0);
    expect(manifest.records.map((record) => record.localPath)).toEqual([
      "docs/learn/architecture.md",
      "specification/2025-06-18/index.md"
    ]);
  });

  it("reports failed downloads and returns non-zero CLI exit code", async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), "mcp-sync-failure-"));
    const llmsBody = "[Architecture](https://modelcontextprotocol.io/docs/learn/architecture)";

    const fetchMock: FetchLike = async (input) => {
      const url = resolveInputUrl(input);
      if (url === DEFAULT_PROTOCOL_SOURCE_URL) {
        return new Response(llmsBody, { status: 200 });
      }
      return new Response("boom", { status: 500, statusText: "Internal Server Error" });
    };

    const cliOutput: string[] = [];
    const stderrOutput: string[] = [];

    const exitCode = await runSyncCli(["--output", outputDir, "--retries", "0"], {
      fetchImpl: fetchMock,
      now: () => new Date("2026-02-27T00:00:00.000Z"),
      stdout: { write: (message: string) => cliOutput.push(message) },
      stderr: { write: (message: string) => stderrOutput.push(message) }
    });

    expect(exitCode).toBe(1);
    expect(cliOutput.join("")).toContain("Failures: 1");
    expect(stderrOutput.join("")).toContain("completed with failures");
  });
});

function resolveInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}
