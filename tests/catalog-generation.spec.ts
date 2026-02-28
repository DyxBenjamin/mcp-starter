import { describe, expect, it } from "vitest";
import {
  buildCatalogGenerationInput,
  buildDocsIndexEntries,
  generateCatalogArtifacts,
  toDocSlug
} from "../tools/generate-catalog.js";

describe("catalog generation", () => {
  it("normalizes documentation paths into stable slugs", () => {
    expect(toDocSlug("docs/getting-started/intro.md")).toBe("docs-getting-started-intro");
    expect(toDocSlug("specification/2025-11-25/server/tools.md")).toBe("specification-2025-11-25-server-tools");
  });

  it("builds docs index entries from a manifest", () => {
    const docs = buildDocsIndexEntries({
      generatedAt: "2026-02-28T00:00:00.000Z",
      records: [
        {
          sourceUrl: "https://example.test/docs/alpha.md",
          localPath: "docs/alpha.md",
          sha256: "abc",
          downloadedAt: "2026-02-28T00:00:00.000Z"
        },
        {
          sourceUrl: "https://example.test/spec/beta.md",
          localPath: "specification/beta.md",
          sha256: "def",
          downloadedAt: "2026-02-28T00:00:00.000Z"
        }
      ]
    });

    expect(docs.map((entry) => entry.slug)).toEqual(["docs-alpha", "specification-beta"]);
  });

  it("generates deterministic TypeScript modules", () => {
    const input = buildCatalogGenerationInput({
      generatedAt: "2026-02-28T00:00:00.000Z",
      records: [
        {
          sourceUrl: "https://example.test/docs/alpha.md",
          localPath: "docs/alpha.md",
          sha256: "abc",
          downloadedAt: "2026-02-28T00:00:00.000Z"
        }
      ]
    });

    const output = generateCatalogArtifacts(input);

    expect(output.modules).toHaveLength(3);
    expect(output.modules.some((module) => module.path.endsWith("catalog.generated.ts"))).toBe(true);
    expect(output.modules.some((module) => module.contents.includes("TOOL_CATALOG"))).toBe(true);
    expect(output.modules.some((module) => module.contents.includes("DOCS_INDEX"))).toBe(true);
  });
});
