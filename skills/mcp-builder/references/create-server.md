# Create MCP Server

## Purpose

Create a new MCP server that is suitable for real agent consumption, not only for transport demonstration. The implementation must establish explicit composition boundaries, a discoverable public surface, deterministic startup behavior, and a validation suite that proves the server can be used safely.

## Scope Decision Before Coding

Before generating any file, lock the following decisions:

1. Runtime target
   - Node.js is the default recommendation.
   - Use ESM unless there is an explicit CJS constraint.
2. Transport target
   - `stdio` for local host integrations and CLI workflows.
   - HTTP only when the server must be remotely reachable.
3. Consumption model
   - local source-mode only
   - package distribution via `npx`
4. Server profile strategy
   - `core` only (demo / narrow use)
   - `core` + `operable` (recommended default for reusable starters)
5. Docs strategy
   - no docs corpus
   - optional docs corpus with graceful degradation
   - required docs corpus with generated catalogs

Do not start file creation before these are explicit.

## Target File Topology

The recommended minimal topology is:

1. `src/server.ts`
   - server factory
   - capability registration
   - profile selection
2. `src/index.ts`
   - process entrypoint
   - transport construction
   - startup error boundary
3. `src/contracts.ts`
   - interfaces for runtime defaults, operation metadata, and catalogs
4. `src/runtime.ts`
   - runtime defaults resolution
   - environment normalization
5. `tests/`
   - startup tests
   - capability tests
   - discoverability tests
6. Optional generator assets
   - `tools/generate-catalog.ts`
   - `src/generated/*.generated.ts`

If the repo already has a different layout, preserve its established boundary style unless it is clearly defective.

## Mandatory Construction Sequence

### Step 1: Define Internal Contracts First

Before registering any capability, define the contracts that drive behavior:

1. Runtime defaults interface
   - fields that may be inherited by tools
   - docs availability state
   - execution mode markers
2. Operation metadata interface
   - `operationId`
   - permission level
   - sensitivity
   - runtime default support
   - pagination semantics
   - docs availability requirement
3. Tool catalog entry interface
4. Resource catalog entry interface
5. Prompt catalog entry interface
6. Docs catalog source interface if docs generation is in scope

This prevents capability registration from becoming ad hoc and inconsistent.

### Step 2: Implement the Factory Boundary

The factory must:

1. Build the server instance.
2. Register capabilities deterministically.
3. Accept explicit options when runtime behavior varies.
4. Avoid process-level side effects.
5. Be testable without a real transport.

Recommended exports:

1. `createCoreMcpServer()`
2. `createMcpServer()`

Rules:

1. `createCoreMcpServer()` is the narrow baseline.
2. `createMcpServer()` should default to the operable profile when the server is intended for reuse.
3. Server metadata (`name`, `version`) must be explicit and stable.

### Step 3: Implement the Entrypoint

The entrypoint must do only the following:

1. Resolve runtime configuration.
2. Pass a server factory to the serving entry: `serveStdio(factory)` from `@modelcontextprotocol/server/stdio` for stdio, `createMcpHandler(factory)` for HTTP. Both serve protocol `2026-07-28` (`server/discover`) and the 2025-era `initialize` handshake; a server connected directly to `StdioServerTransport` speaks only the 2025 era.
3. Close the serving handle on `SIGINT` and `SIGTERM`.
4. Emit deterministic startup failure behavior.

The entrypoint must not contain business logic, catalog generation logic, or capability definitions.

### Step 4: Register the Required Public Surface

#### Minimum demo surface

If the user explicitly wants only a demo server:

1. One example tool
2. One example resource
3. One example prompt

#### Required operable surface

If the server is meant for real agent usage, add all of the following:

1. Fixed resources
   - `status` or equivalent health resource
   - `index`
   - tool catalog
   - resource catalog
   - prompt catalog
   - runtime defaults
   - usage guidance
2. Resource templates
   - documentation lookup
   - schema lookup
   - example lookup
3. Prompts
   - at least one prompt that explains how to discover and use the server
4. Tools
   - explicit descriptions
   - explicit input field descriptions
   - examples reflected in catalogs

This is the minimum pattern that prevents agent guesswork.

## Discoverability Requirements

The server must be self-documenting. That means:

1. `resources/list` returns useful fixed resources.
2. `resources/templates/list` returns meaningful templates.
3. `prompts/list` returns at least one prompt that teaches usage.
4. The `index` resource tells the agent where to look next.
5. The catalog resources are generated from shared definitions rather than duplicated manually whenever possible.

A new server that omits these patterns should be labeled as demo-only in the response.

## Runtime Defaults Requirements

If runtime defaults exist, expose them from day one.

Examples:

1. default account/tenant ID
2. default region
3. default pagination config
4. docs directory
5. execution mode

Rules:

1. Expose them through a fixed resource.
2. Mention them in usage guidance.
3. Annotate which tools can inherit them.
4. Keep behavior deterministic when defaults are absent.

## Permission Model Requirements

If any operation is restricted:

1. Model permissions per operation, not by transport or method.
2. Evaluate permission before business validation where semantic authorization errors are required.
3. Keep the tool discoverable even if restricted, unless the user explicitly wants hidden capabilities.
4. Return structured failures, not ambiguous schema-level rejections when the real issue is authorization.

## Docs Strategy for New Servers

If the server is expected to scale beyond a few hand-authored capabilities:

1. Introduce a generator boundary early.
2. Keep generated artifacts under `src/generated/`.
3. Ensure generation is deterministic.
4. Ensure the server can still start if optional docs are absent.
5. Document the runtime behavior when docs are unavailable.

Do not wait until the catalog is already unmanageable.

## Required Test Plan

A new server is not complete without the following test groups:

1. Factory tests
   - returns a server instance
   - metadata is stable
   - profile selection is deterministic
2. Entrypoint/startup tests
   - transport connect is invoked
   - startup failures are trapped and surfaced predictably
3. Capability tests
   - tool success path
   - tool invalid input path
   - resource read path
   - prompt retrieval path
4. Discoverability tests
   - fixed resources listed
   - templates listed
   - prompts listed
   - index resource points to catalogs and usage
5. Runtime defaults tests
   - defaults reflect environment or injected values
   - defaults absence is handled predictably
6. Packaging tests when distribution matters
   - build succeeds
   - pack dry-run succeeds
   - executable entrypoint is included

## Acceptance Criteria

A new MCP server creation task is complete only if all of the following are true:

1. The server starts successfully through the target transport.
2. The server exposes a coherent public MCP surface.
3. The server is agent-discoverable without trial-and-error.
4. The server has deterministic tests proving core behavior.
5. The entrypoint is operationally separated from business logic.
6. Packaging metadata is correct if the server is intended for `npx` execution.
7. Documentation states exactly how to run the server and what profile it exposes.

## Common Failure Patterns

Avoid these mistakes:

1. Writing capability definitions directly inside the entrypoint.
2. Shipping tools without resource catalogs or usage prompts.
3. Reading environment variables inside every handler instead of normalizing runtime defaults once.
4. Treating a package as publishable without validating `bin` and `files`.
5. Introducing docs templates that crash when the docs corpus is missing.
6. Adding only a tool and calling the server “complete.”
