import { describe, expect, it } from "vitest";
import { findLatestProtocolVersion, protocolVersionOf, selectLatestProtocolUrls } from "../tools/protocol-version.js";

const ORIGIN = "https://modelcontextprotocol.io";
const URLS = [
  `${ORIGIN}/docs/2025-11-25/sdk.md`,
  `${ORIGIN}/docs/2026-07-28/sdk.md`,
  `${ORIGIN}/docs/draft/sdk.md`,
  `${ORIGIN}/specification/2025-11-25/index.md`,
  `${ORIGIN}/specification/2026-07-28/index.md`,
  `${ORIGIN}/docs/learn/architecture.md`
];

describe("protocol-version", () => {
  it("reads the dated segment of versioned URLs", () => {
    expect(protocolVersionOf(`${ORIGIN}/specification/2026-07-28/index.md`)).toBe("2026-07-28");
    expect(protocolVersionOf(`${ORIGIN}/docs/draft/sdk.md`)).toBe("draft");
    expect(protocolVersionOf(`${ORIGIN}/docs/learn/architecture.md`)).toBeNull();
  });

  it("picks the newest released version and ignores draft", () => {
    expect(findLatestProtocolVersion(URLS)).toBe("2026-07-28");
    expect(findLatestProtocolVersion([`${ORIGIN}/docs/learn/architecture.md`])).toBeNull();
  });

  it("keeps unversioned pages and the latest released version only", () => {
    expect(selectLatestProtocolUrls(URLS)).toEqual([
      `${ORIGIN}/docs/2026-07-28/sdk.md`,
      `${ORIGIN}/specification/2026-07-28/index.md`,
      `${ORIGIN}/docs/learn/architecture.md`
    ]);
  });
});
