# Operable MCP Implementation Plan

## Purpose

This document is the explicit execution plan for evolving `mcp-starter` from a transport/demo skeleton into an agent-operable MCP baseline.

It is written to be implementation-ready:
- no hidden decisions are left to the implementer
- every phase has deliverables
- every step defines what to change, why it exists, and how to validate it
- operational constraints and failure modes are documented up front

This plan is intentionally more detailed than the README. The README explains usage. This document explains the implementation strategy and execution order.

---

## 1. Outcome Definition

### 1.1 Primary Goal

Deliver a reusable MCP starter that is not only runnable, but also:
- discoverable by agents
- self-documenting
- permission-aware
- compatible with docs-derived catalogs
- operationally usable in both local development and package distribution modes

### 1.2 What “Done” Means

The project is considered complete for this phase when all of the following are true:

1. An MCP client can connect and immediately discover:
   - fixed resources
   - resource templates
   - prompts
   - tools
2. The server exposes a first-class discovery flow through MCP primitives, not only through README text.
3. Runtime defaults are surfaced through MCP-visible resources.
4. At least one tool demonstrates permission-first execution.
5. The docs corpus can be optional without breaking server startup.
6. Generated catalog artifacts can be rebuilt deterministically.
7. The package includes a publish-oriented shape (`bin`, `files`, metadata, workflow template), even if publication is still disabled by `private: true`.
8. Typecheck, tests, build, and package dry-run pass.

### 1.3 Non-Goals for This Phase

This phase does **not** attempt to:
- implement domain-specific business APIs such as Jambonz endpoints
- fully parse arbitrary OpenAPI documents into tool handlers
- publish the package to npm automatically
- replace the existing simple profile with a forced production-only model

The goal is a robust baseline, not a domain product.

---

## 2. Baseline Architecture

### 2.1 Two-Profile Model

The starter must support two server profiles:

1. `core`
   - minimal profile
   - used for the simplest runnable MCP example
   - contains only foundational primitives

2. `operable`
   - default recommended profile
   - includes discovery resources, templates, usage guidance, runtime defaults, and permission semantics
   - intended to be the profile agents should use in realistic scenarios

### 2.2 Why Two Profiles Exist

This split preserves the original educational simplicity while adding production-grade operational patterns.

Without this split, one of two bad outcomes happens:
- the starter remains too simple and misleads implementers into under-building real servers
- the starter becomes too heavy for basic learning and quick inspection

The two-profile model avoids both problems.

### 2.3 Core Runtime Principle

All server composition must remain centered around a single factory boundary.

That means:
- profile selection happens in server construction
- side effects stay in the process entrypoint
- tests instantiate servers without process-side behavior

This keeps the system deterministic and testable.

---

## 3. Public MCP Surface to Expose

### 3.1 Tools

The starter must expose these tools:

1. `echo`
   - purpose: connectivity and baseline tool contract
   - runtime defaults: not required
   - permissions: none

2. `admin_echo`
   - purpose: demonstrate permission-first execution and runtime default inheritance
   - runtime defaults: supported
   - permissions: requires `write`
   - pagination semantics: 1-based `page/count`

### 3.2 Fixed Resources

The starter must expose these fixed resources:

1. `app://status`
   - liveness and profile summary
2. `app://index`
   - top-level discovery index
3. `app://catalog/tools`
   - complete tool catalog
4. `app://catalog/resources`
   - complete resource and template catalog
5. `app://catalog/prompts`
   - prompt index
6. `app://runtime/defaults`
   - runtime defaults visible to agents
7. `app://usage`
   - operational usage guide

### 3.3 Resource Templates

The starter must expose these templates:

1. `app://doc/{slug}`
   - reads docs corpus entries by generated slug
2. `app://schema/{id}`
   - returns operation metadata and input contract details
3. `app://example/{name}`
   - returns example payloads for tools and prompts

### 3.4 Prompts

The starter must expose these prompts:

1. `summarize`
   - simple user-facing prompt example
2. `server_usage_guide`
   - canonical prompt for teaching another agent how to use this server

---

## 4. Internal Type System and Contracts

### 4.1 Required Internal Contract Modules

The implementation must define explicit internal types for the server’s operable model.

Required interfaces:

1. `ServerInfo`
2. `RuntimeDefaults`
3. `ServerOperationMetadata`
4. `ToolCatalogEntry`
5. `ResourceCatalogEntry`
6. `PromptCatalogEntry`
7. `DocsCatalogSource`
8. `CatalogGenerationInput`
9. `CatalogGenerationOutput`
10. `GeneratedCatalogModule`

### 4.2 Why These Types Matter

These types prevent drift across:
- runtime behavior
- generated artifacts
- discovery resources
- prompts
- tests

Without these types, the server becomes hand-maintained in multiple places and will diverge quickly.

### 4.3 Contract Rule

The catalog seed and generator pipeline must be the source of truth for discoverability.

The server should not duplicate ad-hoc catalog strings if the same data already exists in generated modules.

---

## 5. Runtime Defaults Design

### 5.1 Runtime Defaults Must Be First-Class

The starter must treat runtime defaults as MCP-visible state, not hidden environment-only behavior.

### 5.2 Runtime Defaults to Support

The baseline runtime defaults contract should include:
- `defaultAccountSid`
- `defaultServiceProviderSid`
- `defaultRegion`
- `defaultPage`
- `defaultCount`
- `docsDir`
- `docsAvailable`
- `docsManifestPath`
- `environment`
- `permissionLevel`
- `sourceModeCommand`
- `packageModeCommand`

### 5.3 Environment Variables

The resolver should read from:
- `MCP_DEFAULT_ACCOUNT_SID`
- `MCP_DEFAULT_SERVICE_PROVIDER_SID`
- `MCP_DEFAULT_REGION`
- `MCP_DEFAULT_PAGE`
- `MCP_DEFAULT_COUNT`
- `MCP_PERMISSION_LEVEL`
- `MCP_DOCS_DIR`
- `NODE_ENV`

### 5.4 Expected Behavior

1. If an override is provided explicitly in code, it wins.
2. If an environment variable exists, it is used.
3. If neither exists, the generated runtime defaults template provides the fallback.
4. `docsAvailable` is derived from whether the docs manifest exists unless explicitly overridden.

### 5.5 Design Annotation

This pattern exists because agents often waste calls trying to “discover” values that the runtime already knows.

Surfacing defaults through `app://runtime/defaults` reduces that waste and improves first-call accuracy.

---

## 6. Permission Model

### 6.1 Permission Semantics

The starter must model permissions at the **operation** level, not by transport, not by HTTP verb, and not by generic route category.

### 6.2 Required Permission Levels

Use this baseline permission scale:
- `none`
- `read`
- `write`
- `admin`

### 6.3 Required Permission Behavior

For any restricted operation:
1. The tool remains visible in discovery.
2. The handler evaluates permission **before** endpoint-specific validation.
3. If permission is insufficient, the tool returns a semantic permission error result.
4. The system must not rely on SDK input validation to reject restricted calls before the handler can enforce the permission gate.

### 6.4 Why This Order Is Mandatory

If validation runs first, agents receive `InvalidParams`-style errors for a request that was actually unauthorized.

That leads to incorrect retry behavior and incorrect agent reasoning.

Permission-first behavior is operationally more truthful.

### 6.5 Demonstration Tool

`admin_echo` exists specifically to prove this model:
- with insufficient permission: returns permission-denied semantics
- with sufficient permission but missing business input: returns validation semantics
- with sufficient permission and valid input: executes successfully

---

## 7. Discoverability and Self-Documentation

### 7.1 Mandatory Discovery Flow

An agent should be able to understand the server without trial-and-error.

The recommended discovery order must be encoded in resources and prompts:

1. `app://index`
2. `app://catalog/tools`
3. `app://runtime/defaults`
4. `app://catalog/resources`
5. `app://catalog/prompts`
6. `app://usage`

### 7.2 What `app://index` Must Contain

The index resource must include:
- server identity
- recommended profile
- discovery order
- summarized tools
- summarized resources
- summarized prompts
- execution mode guidance
- docs availability signal

### 7.3 What `app://catalog/tools` Must Contain

Each tool entry must include:
- name
- title
- description
- operation id
- permission requirement
- sensitivity
- whether it supports runtime defaults
- pagination mode
- input fields and descriptions
- examples
- usage notes
- docs references

### 7.4 What `app://usage` Must Contain

The usage guide resource must explicitly document:
- discovery order
- 1-based pagination convention when applicable
- runtime default usage
- permission semantics
- source mode vs package mode
- docs availability behavior

### 7.5 Why This Is Necessary

Agents commonly inspect `resources/list`, `resources/templates/list`, and `prompts/list` before they call tools.

If the server is not self-describing at that layer, they are forced into error-prone inference.

---

## 8. Resource Template Design

### 8.1 `app://doc/{slug}`

Purpose:
- expose a docs-backed retrieval primitive for agents

Behavior:
1. If the slug is unknown, return a deterministic “unknown documentation slug” response.
2. If the docs corpus is unavailable, return a deterministic “documentation corpus unavailable” response.
3. If the docs file exists, return the markdown content.

### 8.2 `app://schema/{id}`

Purpose:
- expose operation metadata and contract information

Behavior:
1. If the operation id is unknown, return a deterministic “unknown operation id” response.
2. If found, return:
   - operation metadata
   - runtime-default subset relevant to that operation

### 8.3 `app://example/{name}`

Purpose:
- expose example payloads for tools and prompts

Behavior:
1. If the name matches a tool, return tool examples and runtime-default notes.
2. If the name matches a prompt, return prompt examples and usage intent.
3. If no match exists, return a deterministic “unknown example target” response.

### 8.4 Template Completion

Template completions should help agents discover valid values.

Expected completions:
- `doc.slug` from generated docs index slugs
- `schema.id` from operation ids
- `example.name` from tool names and prompt names

---

## 9. Docs-Derived Catalog Generation

### 9.1 Generator Purpose

The generator exists to make discoverability data deterministic and reproducible.

It bridges:
- source catalog seed data
- synced protocol docs manifest
- generated TypeScript modules consumed at runtime

### 9.2 Required Inputs

The generator must read:
1. source seeds (tools/resources/prompts/runtime defaults)
2. docs manifest at `docs/protocol/manifest.json`

### 9.3 Required Outputs

The generator must emit:
1. `src/generated/catalog.generated.ts`
2. `src/generated/runtime-contracts.generated.ts`
3. `src/generated/docs-index.generated.ts`

### 9.4 Determinism Rule

Given the same manifest and same seeds, the generated output must be byte-stable.

This matters for:
- review clarity
- CI reproducibility
- publish confidence

### 9.5 Build Integration

The build must always regenerate catalogs first.

Required sequence:
1. `catalog:generate`
2. `tsup build`

This prevents stale generated artifacts from shipping.

---

## 10. Packaging and Distribution

### 10.1 Package Shape

The package must be structured as if it is intended for distribution, even if `private: true` remains enabled.

Required metadata:
- `name`
- `version`
- `description`
- `license`
- `homepage`
- `bugs.url`
- `repository.url`
- `main`
- `types`
- `exports`
- `files`
- `bin`

### 10.2 Required `bin`

The package must expose:
- `mcp-starter` -> `dist/index.js`

This ensures the stable published command is:
- `npx -y mcp-starter`

### 10.3 Required `files` Whitelist

The whitelist should include only what the package needs:
- `dist`
- `README.md`
- `LICENSE`
- `docs/protocol`
- `docs/publishing.md`

### 10.4 Why Source Mode and Package Mode Must Be Documented Separately

These are not equivalent operationally:

1. Source mode:
   - `npx tsx src/index.ts`
   - cwd-sensitive
   - intended for local development

2. Package mode:
   - `npx -y mcp-starter`
   - stable client-facing command after publish
   - should not require repo cwd assumptions

This distinction must be explicit to avoid broken client registration flows.

### 10.5 Publish Workflow Template

A publish workflow should exist even if not active for production.

The template must:
1. install dependencies
2. regenerate catalogs
3. run typecheck
4. run tests
5. run build
6. run package dry-run
7. publish with provenance on tag builds

---

## 11. Test Plan

### 11.1 Server Capability Tests

The test suite must validate:
- the server still instantiates cleanly
- the entrypoint still connects using an injected transport boundary
- the operable profile exposes:
  - both tools
  - fixed resources
  - resource templates
  - both prompts

### 11.2 Permission Pipeline Tests

The suite must explicitly prove:
- restricted tools remain visible
- restricted calls with low permission fail semantically as permission errors
- authorized calls with invalid business input fail semantically as validation errors
- authorized valid calls succeed and consume runtime defaults correctly

### 11.3 Resource Read Tests

The suite must validate:
- `app://runtime/defaults` reflects injected runtime values
- `app://usage` contains expected operational conventions
- `app://schema/admin-echo` returns operation metadata
- `app://example/admin_echo` returns example data
- `app://doc/{slug}` degrades correctly when docs are unavailable

### 11.4 Catalog Generation Tests

The generator tests must cover:
- slug normalization
- docs index generation from manifest shape
- deterministic module emission

### 11.5 Packaging Tests

The packaging tests must assert:
- publish-oriented package metadata is present
- `bin` points to `dist/index.js`
- `build` includes `catalog:generate`
- publish workflow template exists and includes provenance + dry-run verification

---

## 12. Execution Sequence (Step-by-Step)

This is the recommended exact implementation order.

### Phase A: Define contracts

1. Create a contract module for internal metadata types.
2. Define the runtime defaults shape.
3. Define tool/resource/prompt catalog entry types.
4. Define catalog generation input/output interfaces.

Annotation:
- This phase prevents ad-hoc shape drift later.

### Phase B: Define source-of-truth seed data

1. Create the catalog seed file.
2. Encode tool metadata, resource metadata, prompt metadata, and runtime defaults template.
3. Mark which tools support runtime defaults and which require permissions.

Annotation:
- This phase is where discoverability semantics are declared.

### Phase C: Build generator pipeline

1. Read `docs/protocol/manifest.json`.
2. Normalize doc paths into stable slugs.
3. Emit generated TypeScript modules.
4. Wire generation into a dedicated script.

Annotation:
- The generator is optional for future domains, but mandatory for this starter’s operable profile.

### Phase D: Build runtime resolver

1. Resolve environment variables.
2. Apply explicit overrides.
3. Derive docs availability.
4. Normalize permission levels.

Annotation:
- The server must not treat env defaults as hidden implementation detail.

### Phase E: Rebuild server composition

1. Split core profile from operable profile.
2. Keep the core profile minimal.
3. Add operable resources.
4. Add resource templates.
5. Add `server_usage_guide`.
6. Add `admin_echo` with permission-first semantics.

Annotation:
- This is the functional center of the work.

### Phase F: Upgrade entrypoint and package surface

1. Add a node shebang to the entrypoint.
2. Update package metadata.
3. Add a `bin` entry.
4. Add build orchestration for catalog generation.
5. Add packaging dry-run script.

Annotation:
- This is what makes local and future published usage coherent.

### Phase G: Update documentation

1. Rewrite README around profiles and discovery.
2. Add a publication checklist.
3. Add a workflow template.

Annotation:
- The README explains usage. The publication doc explains operational release steps.

### Phase H: Expand tests

1. Update server tests to cover operable resources/templates/prompts.
2. Add permission pipeline tests.
3. Add generator tests.
4. Add packaging tests.

Annotation:
- These tests prove the design is real, not merely documented.

### Phase I: Validate end-to-end

Run exactly:

```bash
npm run catalog:generate
npm run typecheck
npm test
npm run build
npm run pack:dry-run
```

Optional manual check:

```bash
npm run inspect
```

Then confirm in Inspector:
- resources are listed
- resource templates are listed
- prompts are listed
- `admin_echo` is listed
- restricted behavior is discoverable and explainable

---

## 13. Failure Modes and Expected Responses

### 13.1 Docs Corpus Missing

Expected result:
- server still starts
- `app://doc/{slug}` remains discoverable
- template read returns an explicit unavailable response

### 13.2 Low Permission Caller

Expected result:
- restricted tool is still listed
- tool returns a semantic permission denial result
- tool does not fail with premature schema rejection

### 13.3 Unknown Template Value

Expected result:
- deterministic text response explaining the miss
- no uncaught exception

### 13.4 Stale Generated Files

Mitigation:
- `build` always runs `catalog:generate` first

### 13.5 Package Publish Attempt While Private

Expected result:
- publication is blocked by `private: true`
- documentation explains the required explicit step to enable publication

---

## 14. Operator Notes

### 14.1 For Local Development

Use:

```bash
npx tsx src/index.ts
```

This assumes the current working directory is the repository root.

### 14.2 For Inspector Testing

Use:

```bash
npm run inspect
```

Then verify discovery behavior first, not only tool execution.

### 14.3 For Future npm Publication

After removing `private: true`, the intended client-facing command becomes:

```bash
npx -y mcp-starter
```

This is the preferred stable registration path because it removes local cwd assumptions.

---

## 15. Recommended Future Extensions

These are the next logical layers after this plan is complete.

1. Replace the seeded catalog with domain-generated operations from OpenAPI.
2. Add domain-specific docs corpus parsing beyond the MCP protocol docs.
3. Add structured error taxonomy per operation.
4. Add optional HTTP transport profile with the same discovery resources.
5. Add conformance tests against an MCP conformance suite.
6. Add release tagging/version automation.

These are downstream expansions, not required for the current baseline.

---

## 16. Final Acceptance Checklist

Before considering the work complete, verify all items below:

- [ ] `core` profile still starts and exposes basic primitives
- [ ] `operable` profile starts by default
- [ ] fixed resources are listed
- [ ] resource templates are listed
- [ ] prompts are listed
- [ ] `app://index` documents discovery order
- [ ] `app://runtime/defaults` exposes runtime values
- [ ] `app://usage` explains pagination, permission semantics, and execution modes
- [ ] `admin_echo` is visible when restricted
- [ ] `admin_echo` checks permission before endpoint-specific validation
- [ ] docs templates degrade gracefully when docs are unavailable
- [ ] generated artifacts rebuild deterministically
- [ ] package metadata is publish-oriented
- [ ] publish workflow template exists
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `npm run pack:dry-run` passes

