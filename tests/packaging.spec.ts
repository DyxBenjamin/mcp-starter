import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("packaging surface", () => {
  it("declares publish-oriented package metadata", async () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      private: boolean;
      repository: { url: string };
      bin: Record<string, string>;
      files: string[];
      scripts: Record<string, string>;
      license: string;
    };

    expect(packageJson.private).toBe(true);
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository.url).toContain("github.com/DyxBenjamin/mcp-starter");
    expect(packageJson.bin["mcp-starter"]).toBe("dist/index.js");
    expect(packageJson.files).toContain("docs/publishing.md");
    expect(packageJson.scripts.build).toContain("catalog:generate");
  });

  it("ships a publish workflow template", async () => {
    const workflowPath = path.resolve(process.cwd(), ".github/workflows/publish.yml");
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("npm publish --provenance --access public");
    expect(workflow).toContain("bun run pack:dry-run");
  });
});
