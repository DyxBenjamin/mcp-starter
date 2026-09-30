---
name: mcp-builder
description: Build, edit, and extend Model Context Protocol (MCP) servers with deterministic TypeScript workflows, strict typing, test gates, operable agent-facing discoverability patterns, permission-first handlers, runtime defaults, docs-derived catalogs, and publish-ready packaging. Use when creating a new MCP server, refactoring an existing MCP server, adding tools/resources/resource templates/prompts, hardening agent discoverability, introducing runtime defaults and permission semantics, or making an MCP package ready for real distribution and operational use.
---

# MCP Builder

## Mission

Deliver MCP servers that are production-credible, agent-legible, and operationally safe. Treat MCP implementation as a contract system, not as a transport demo. The server must be discoverable, self-documenting, testable, and explicit about runtime defaults, permissions, and packaging boundaries.

## Non-Negotiable Standards

1. Preserve public contracts unless the user explicitly authorizes a breaking change.
2. Treat tools, resources, resource templates, and prompts as first-class public APIs.
3. Keep side effects in the process entrypoint only; keep construction and capability registration in factory modules.
4. Do not use `any`. Use `unknown` plus explicit narrowing at runtime.
5. Every behavior change must be proven by deterministic tests before delivery.
6. Agent discoverability is mandatory for any server intended for real use. A server that only registers tools is incomplete.
7. Permission checks for restricted operations must occur before business validation when the handler needs to return semantic authorization failures.
8. Generated catalogs must be deterministic and safe to regenerate.
9. Documentation must state execution mode assumptions (`source` vs `package`) whenever distribution is in scope.
10. Do not hand-wave missing implementation. If context is incomplete, isolate the unknown area behind a clearly bounded interface.
11. Target MCP protocol `2026-07-28` with the TypeScript SDK v2 (`@modelcontextprotocol/server`) and Zod 4, keeping 2025-era clients served through the same factory. Handlers hold no per-connection state, and new servers do not adopt the deprecated Roots, Sampling, or Logging features.

## When This Skill Applies

Use this skill whenever the request involves any of the following:

1. Creating a new MCP server from scratch.
2. Refactoring or reorganizing an existing MCP server.
3. Adding or modifying tools.
4. Adding or modifying resources.
5. Adding or modifying resource templates.
6. Adding or modifying prompts.
7. Adding runtime defaults or permission semantics.
8. Adding docs-driven generation.
9. Hardening packaging, `bin` entrypoints, or publish workflows.
10. Upgrading a demo MCP into an operable, agent-ready server.

## Required Working Model

Always reason in the following layers, in this order:

1. **Public contract layer**
   - Tool identifiers
   - Resource URIs
   - Resource template URI patterns
   - Prompt identifiers
   - Server metadata (`name`, `version`)
2. **Composition layer**
   - Factory functions
   - Profile split (`core` vs `operable`)
   - Dependency injection boundaries
3. **Execution layer**
   - Transport wiring
   - Runtime defaults resolution
   - Permission evaluation
   - Handler execution
4. **Documentation and discovery layer**
   - Index resources
   - Catalog resources
   - Usage guidance prompts
   - Docs-derived generated artifacts
5. **Distribution layer**
   - `bin` execution
   - package metadata
   - file whitelist
   - build and pack verification

Do not skip directly to code changes before establishing the current state of all affected layers.

## Mandatory Workflow

### Phase 1: Establish the Current Boundary

1. Identify the runtime and package environment.
   - Node.js vs Deno vs other
   - package manager
   - module system (ESM/CJS)
2. Locate the process entrypoint.
3. Locate the server factory or registration boundary.
4. Enumerate all externally visible contracts.
   - Existing tools
   - Existing resources
   - Existing templates
   - Existing prompts
   - Existing metadata/version
5. Determine whether generated artifacts exist.
   - Generated catalogs
   - Generated docs indexes
   - Generated schema contracts
6. Determine whether packaging is in scope.
   - local-only source usage
   - package distribution via `npx`
7. Determine whether the change is:
   - new server creation
   - safe mutation
   - capability extension
   - packaging hardening

If this phase is incomplete, do not mutate code yet.

### Phase 2: Load Only the Required Reference Material

Read only the reference file(s) needed for the request:

1. New server build: `references/create-server.md`
2. Existing server mutation: `references/edit-server.md`
3. Capability addition or expansion: `references/extend-server.md`
4. Validation design or regression planning: `references/test-matrix.md`

If more than one applies, use the minimum set that covers the task. Do not bulk-load references without need.

### Phase 3: Lock the Intended Outcome

Before editing, state the target in concrete terms:

1. Which public contracts must stay unchanged.
2. Which new public contracts will be introduced.
3. Whether the result must remain backward-compatible.
4. Whether the server should expose a `core` profile, an `operable` profile, or both.
5. Whether discoverability resources are mandatory.
6. Whether docs-driven generation is optional or required.
7. Whether packaging and publication are part of the requested scope.

This phase prevents accidental drift and over-engineering.

### Phase 4: Implement in the Correct Order

Always mutate in this order:

1. Internal contracts and types
   - runtime defaults
   - operation metadata
   - catalog entry shapes
   - generated artifact interfaces
2. Pure business logic and helper functions
3. Capability registration in the server factory
4. Transport wiring or entrypoint changes
5. Discoverability resources and prompts
6. Generated artifacts or generator scripts
7. Documentation updates
8. Tests

Do not start with the entrypoint when the real change belongs in contracts or factory composition.

### Phase 5: Validate Before Declaring Completion

The minimum validation gate is:

1. Typecheck
2. Unit tests for all changed behavior
3. Discoverability verification for agent-facing contracts
4. Startup smoke test for the selected transport
5. Package dry-run when distribution is in scope

If any gate fails, the task is incomplete.

## Required Architecture Pattern

### Profile Strategy

Use a two-profile model unless the user explicitly asks for a bare minimal demo:

1. `core`
   - smallest runnable transport-safe baseline
   - may expose only minimal examples
   - useful for local experimentation and narrow integrations
2. `operable`
   - default for agent-facing use
   - must include discoverability primitives
   - must expose runtime defaults when relevant
   - must provide enough context that an agent can act without guessing

If only one profile is implemented, it must still satisfy the `operable` obligations when the server is intended for real agent consumption.

### Required Operable Surface

For any real agent-facing server, the expected baseline is:

1. Fixed resources:
   - server status (optional but recommended)
   - `index`
   - tool catalog
   - resource catalog
   - prompt catalog
   - runtime defaults
   - usage guidance
2. Resource templates:
   - documentation lookup
   - schema lookup
   - example lookup
3. Prompts:
   - at least one prompt that teaches discovery and usage
4. Tools:
   - explicit descriptions
   - explicit field descriptions
   - examples or usage notes visible through catalogs

A server that omits these patterns should be treated as demo-only unless the user explicitly accepts that limitation.

## Decision Rules

### If Creating a New Server

1. Start with `references/create-server.md`.
2. Create a factory module first.
3. Create an entrypoint second.
4. Define runtime contracts before registering capabilities.
5. Add at least one test per public primitive added.
6. If the user wants a reusable starter, default to the operable profile.

### If Editing an Existing Server

1. Start with `references/edit-server.md`.
2. Map the current public contract before touching code.
3. Prefer the smallest compatible mutation.
4. Add regression tests that prove unchanged behavior for unaffected public APIs.
5. Treat renamed IDs, URIs, and prompt names as breaking changes.

### If Extending Capabilities

1. Start with `references/extend-server.md`.
2. Define the new capability contract first.
3. Decide whether the capability belongs in `core`, `operable`, or both.
4. Update discoverability resources immediately.
5. Add positive, negative, and permission-path tests.

### If Hardening Packaging or Publication

1. Verify `bin` entry behavior.
2. Verify `files` whitelist.
3. Verify `repository`, `license`, `homepage`, and `bugs` metadata.
4. Run build and package dry-run.
5. Document source-mode vs package-mode execution.
6. Treat package execution as a public contract.

## Permission and Validation Policy

For restricted operations, use this exact ordering:

1. Resolve operation metadata.
2. Evaluate permission gate.
3. Resolve runtime defaults.
4. Perform operation-specific validation.
5. Execute business logic.
6. Shape deterministic success or failure payload.

Rationale:

- If the SDK rejects the request before the handler runs, the agent receives a misleading schema error instead of a meaningful authorization error.
- For restricted operations, expose schemas permissively enough that the handler can return the correct semantic failure.

Do not model permissions solely by HTTP method. Model them per operation.

## Runtime Defaults Policy

If the runtime already knows a value that agents would otherwise waste calls rediscovering, expose it.

Typical runtime defaults include:

1. Account or tenant identifiers
2. Region defaults
3. Pagination defaults
4. Docs directory / docs availability
5. Execution mode (`source`, `package`)
6. Feature flags

Rules:

1. Expose defaults through MCP resources.
2. Reference those defaults in catalogs and usage prompts.
3. Mark which tools can inherit defaults.
4. Keep the behavior deterministic when defaults are absent.

## Docs-Derived Generation Policy

For larger servers, discoverability and operation metadata should be generated from a source corpus instead of being hand-maintained.

Expected generated outputs may include:

1. tool catalog module
2. runtime contract module
3. docs index module
4. operation metadata module

Rules:

1. Inputs must be local, deterministic, and explicit.
2. Output ordering must be stable.
3. The generator must be safe to rerun.
4. Generated files must not require manual edits.
5. Tests must cover both corpus-present and corpus-absent behavior if docs are optional.

## Required Deliverables

A complete task outcome should include, as applicable:

1. Updated implementation code
2. Updated tests
3. Updated generated artifacts
4. Updated operational documentation
5. A concise compatibility note
6. A concise residual-risk note if any boundary remains untested

Do not report completion with code changes only and no proof.

## Failure Modes to Detect Explicitly

Watch for and address these conditions:

1. Tool is listed but lacks enough description for safe use.
2. Resources exist but templates are absent, so `resources/templates/list` is empty.
3. Prompts exist but none teach discovery.
4. Runtime defaults exist in environment variables but are invisible to agents.
5. Permission logic runs after schema validation, producing misleading errors.
6. Generated catalogs drift from real capability registration.
7. The source-mode command works, but the packaged `npx` execution path does not.
8. Docs-based lookups crash when the docs corpus is missing.
9. Packaging includes the wrong files or omits the executable entrypoint.
10. A refactor preserves internal code quality but silently breaks a public MCP identifier.

## Completion Checklist

Before finishing, confirm all applicable items:

1. Public contract inventory was captured.
2. Correct reference file(s) were used.
3. Profile strategy was explicit.
4. Capability discoverability is coherent.
5. Runtime defaults are either exposed or explicitly out of scope.
6. Permission ordering is correct for restricted operations.
7. Tests prove the changed behavior.
8. Packaging is validated if distribution matters.
9. Documentation reflects the true execution path.
10. Response includes what changed, what remains risky, and what was validated.
