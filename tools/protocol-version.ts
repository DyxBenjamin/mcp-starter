/**
 * @file Parses protocol versions from MCP docs URLs and selects the pages of the latest released version.
 * @tags protocol-version, docs-sync
 * @related tools/sync-protocol-docs.ts, tests/protocol-version.spec.ts
 */
const VERSIONED_PATH = /^\/(?:docs|specification)\/(\d{4}-\d{2}-\d{2}|draft)\//;

/** Returns the dated segment of a versioned MCP docs URL (`2026-07-28`, `draft`), or `null` when unversioned. */
export function protocolVersionOf(url: string): string | null {
  return VERSIONED_PATH.exec(new URL(url).pathname)?.[1] ?? null;
}

/** Returns the newest released protocol version referenced by `urls`, ignoring `draft`. */
export function findLatestProtocolVersion(urls: readonly string[]): string | null {
  const released = urls
    .map(protocolVersionOf)
    .filter((version): version is string => version !== null && version !== "draft")
    .sort();
  return released.at(-1) ?? null;
}

/** Keeps unversioned pages and pages of the latest released protocol version. */
export function selectLatestProtocolUrls(urls: readonly string[]): string[] {
  const latest = findLatestProtocolVersion(urls);
  return urls.filter((url) => {
    const version = protocolVersionOf(url);
    return version === null || version === latest;
  });
}
