# MCP Starter

Agent-ready TypeScript MCP starter with two profiles:

- `core`: minimal transport/runtime profile with one tool, one fixed resource, and one prompt
- `operable`: recommended default profile with discovery resources, resource templates, usage guidance, runtime defaults, and permission-aware examples

## Commands

- `npm run dev`: start the operable server profile with stdio transport
- `npx tsx src/index.ts`: run directly from source mode (requires correct cwd)
- `npm run catalog:generate`: rebuild generated catalog artifacts from docs manifest + source seeds
- `npm run build`: regenerate catalogs and build the package entrypoint
- `npm run typecheck`: run TypeScript validation
- `npm test`: run deterministic unit tests
- `npm run protocol:sync`: refresh the MCP protocol docs under `docs/protocol`
- `npm run inspect`: launch MCP Inspector against the local source server
- `npm run inspect:help`: show MCP Inspector CLI options
- `npm run pack:dry-run`: verify package contents and publish surface

## Implementation Plan

The detailed implementation and hardening plan lives in [OPERABLE_MCP_IMPLEMENTATION_PLAN.md](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/OPERABLE_MCP_IMPLEMENTATION_PLAN.md).

## Profiles

### Core profile

Available through `createCoreMcpServer()` in [src/server.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/src/server.ts).

Includes:
- tool: `echo`
- resource: `app://status`
- prompt: `summarize`

### Operable profile

Default profile through `createMcpServer()` and `startServer()`.

Adds:
- fixed resources:
  - `app://index`
  - `app://catalog/tools`
  - `app://catalog/resources`
  - `app://catalog/prompts`
  - `app://runtime/defaults`
  - `app://usage`
- resource templates:
  - `app://doc/{slug}`
  - `app://schema/{id}`
  - `app://example/{name}`
- prompt:
  - `server_usage_guide`
- permission-aware tool:
  - `admin_echo`

## Discovery flow for agents

Recommended order:
1. Read `app://index`
2. Read `app://catalog/tools`
3. Read `app://runtime/defaults`
4. Read `app://catalog/resources` and `app://catalog/prompts`
5. Use `app://usage` or prompt `server_usage_guide` before non-trivial calls

This prevents unnecessary discovery when runtime defaults already exist.

## Runtime defaults

The operable profile exposes environment-derived defaults through `app://runtime/defaults`.

Supported environment variables:
- `MCP_DEFAULT_ACCOUNT_SID`
- `MCP_DEFAULT_SERVICE_PROVIDER_SID`
- `MCP_DEFAULT_REGION`
- `MCP_DEFAULT_PAGE`
- `MCP_DEFAULT_COUNT`
- `MCP_PERMISSION_LEVEL` (`none`, `read`, `write`, `admin`)
- `MCP_DOCS_DIR`

Behavior:
- if `MCP_DOCS_DIR` points to a valid docs corpus, `app://doc/{slug}` reads markdown files from that location
- if not, docs templates stay discoverable but return a deterministic “docs unavailable” response

## Permission model

The starter demonstrates permission-first execution in `admin_echo`:
- the tool remains visible in discovery
- permission is checked before endpoint-specific validation
- blocked calls return a semantic permission error instead of a premature schema failure

This models the “visible vs usable” distinction real agent-facing servers need.

## Docs-derived generated artifacts

Generated modules live in `src/generated/`:
- [catalog.generated.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/src/generated/catalog.generated.ts)
- [runtime-contracts.generated.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/src/generated/runtime-contracts.generated.ts)
- [docs-index.generated.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/src/generated/docs-index.generated.ts)

They are rebuilt by [tools/generate-catalog.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/tools/generate-catalog.ts) using:
- source seeds in [catalog-seed.ts](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/src/catalog-seed.ts)
- the synced protocol docs manifest in [docs/protocol/manifest.json](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/docs/protocol/manifest.json)

## Inspector / DevTools

This starter includes integration with **MCP Inspector**.

1. Run `npm run inspect`
2. Open the Inspector URL shown in the terminal
3. Inspect tools, fixed resources, resource templates, prompts, and ping behavior

## Packaging and distribution

This package now includes:
- a `bin` entry (`mcp-starter`)
- a constrained `files` whitelist
- repository, bugs, homepage, and license metadata
- a publish workflow template at [publish.yml](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/.github/workflows/publish.yml)
- a publication checklist at [publishing.md](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/docs/publishing.md)

Recommended execution modes:
1. Source mode: `npx tsx src/index.ts` (local development, cwd-dependent)
2. Package mode: `npx -y mcp-starter` (stable client-facing command once published)

## Skill

The reusable implementation workflow lives in [skills/mcp-builder/SKILL.md](/Users/qrsof/Documents/benjamin/devclusters/workspaces/@dyxbenjamin/AI/mcp-starter/skills/mcp-builder/SKILL.md).
