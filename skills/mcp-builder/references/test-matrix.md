# MCP Server Test Matrix

## Purpose

This matrix defines the minimum deterministic proof required before an MCP implementation, refactor, or extension can be considered complete. The target is not superficial coverage. The target is contractual confidence across public APIs, discoverability, runtime defaults, permission semantics, startup lifecycle, and packaging.

## Testing Principles

1. Test public behavior, not internal trivia.
2. Mock or stub all external I/O.
3. Keep transport-independent logic testable without real process wiring.
4. Validate both the capability itself and the discoverability surface that explains it.
5. For generators, prove deterministic output across reruns.
6. For restricted operations, prove authorization semantics explicitly.

## Required Test Domains

### 1. Composition and Factory Tests

These tests prove the server can be constructed safely.

Required assertions:

1. Factory returns a valid server instance.
2. Server metadata (`name`, `version`) is stable.
3. Profile selection (`core`, `operable`) behaves deterministically.
4. Capability registration does not depend on process-global side effects.
5. The factory can be tested without a real transport.

Failure indications:

1. Construction throws under normal input.
2. Metadata changes unexpectedly.
3. Profiles expose inconsistent surfaces.

### 2. Startup and Entrypoint Tests

These tests prove process boot is operationally correct.

Required assertions:

1. The serving entry (`serveStdio` or `createMcpHandler`) receives the server factory exactly once.
2. Integration tests connect a client in each supported protocol era: `2026-07-28` through `serveStdio(factory, { transport })` with a client pinned by `versionNegotiation: { mode: { pin: "2026-07-28" } }`, and `2025-11-25` through `server.connect(transport)` with a default client.
3. Startup failures are trapped and surfaced predictably.
4. The entrypoint does not duplicate business logic.
5. Packaged execution path resolves the same entrypoint contract when distribution is in scope.

Failure indications:

1. The factory never reaches the serving entry, or only one protocol era is exercised.
2. Startup throws without a bounded error path.
3. Source-mode works but package-mode does not.

### 3. Capability Contract Tests

Every changed or added capability must have contract tests.

Required assertions per tool:

1. Valid input succeeds.
2. Malformed input fails predictably.
3. Domain failure path is deterministic.
4. Output shape is stable.
5. External side effects are mocked.

Required assertions per fixed resource:

1. URI resolves deterministically.
2. Content shape is stable.
3. Runtime-dependent absence returns a controlled state.

Required assertions per resource template:

1. Valid variable values resolve correctly.
2. Unknown values throw `ResourceNotFoundError` (JSON-RPC `-32602`); known values whose backing data is missing return a stable “unavailable” response.
3. Optional completion behavior is stable if implemented.

Required assertions per prompt:

1. Prompt is listed.
2. Prompt retrieval works.
3. Required variables are enforced.
4. Prompt output matches the documented intent.

### 4. Discoverability Tests

These tests prove agents can orient themselves without guesswork.

Required assertions:

1. `resources/list` includes all intended fixed resources.
2. `resources/templates/list` includes all intended templates.
3. `prompts/list` includes all intended prompts.
4. The `index` resource points to the correct catalogs and usage resources.
5. Tool catalog entries match actual registered tools.
6. Resource catalog entries match actual fixed resources and templates.
7. Prompt catalog entries match actual registered prompts.

Failure indications:

1. Capability exists but is missing from catalogs.
2. Template exists but is absent from template listing.
3. Usage guidance points to stale identifiers.

### 5. Runtime Defaults Tests

These tests prove environment-derived context is visible and deterministic.

Required assertions:

1. Runtime defaults resource reflects injected or normalized environment values.
2. Missing defaults are represented explicitly, not by crashes or silent omission.
3. Tools that support inherited defaults document and honor them.
4. Usage guidance references runtime defaults accurately.
5. Execution mode (`source` vs `package`) is surfaced correctly when the server models it.

Failure indications:

1. Defaults exist in process state but are invisible to agents.
2. Missing defaults cause unpredictable behavior.
3. Catalogs claim inheritance that the handler does not honor.

### 6. Permission Semantics Tests

These tests are mandatory for any restricted operation.

Required assertions:

1. Restricted capability remains discoverable unless intentionally hidden.
2. Permission denial occurs before business validation when semantic authorization errors are expected.
3. Authorized path still succeeds.
4. The failure payload distinguishes permission denial from malformed input.
5. Operation-level permission metadata matches handler behavior.

Failure indications:

1. The SDK rejects input before the handler can return the correct authorization error.
2. Permission is modeled too coarsely and leaks sensitive operations.
3. Catalogs misstate the required permission level.

### 7. Docs and Generated Artifact Tests

These tests apply when docs-derived generation exists.

Required assertions:

1. Generator succeeds against the expected local corpus.
2. Generated ordering is deterministic across reruns.
3. Generated catalogs match the live registered capabilities.
4. Corpus-present behavior works.
5. Corpus-absent behavior degrades gracefully when docs are optional.
6. Generated files are not hand-edited drift artifacts.

Failure indications:

1. Regeneration changes output ordering without source changes.
2. Catalog output diverges from actual capability registration.
3. Docs lookup crashes when the corpus is unavailable.

### 8. Packaging and Distribution Tests

These tests are required when the server is intended for reuse beyond local source execution.

Required assertions:

1. Build succeeds.
2. Package dry-run succeeds.
3. `bin` entry points to a valid executable target.
4. `files` whitelist includes everything needed and excludes unnecessary artifacts.
5. Package metadata required for publication is present.
6. `npx` execution path matches documented behavior.

Failure indications:

1. Local source run works but packed artifact is incomplete.
2. The executable is omitted from the package.
3. The package metadata is insufficient for publication workflows.

## Minimum Test Set by Scenario

### New Server

Must include:

1. factory tests
2. startup tests
3. one contract test per public primitive added
4. discoverability tests
5. runtime defaults tests if defaults exist
6. packaging tests if distribution is in scope

### Existing Server Edit

Must include:

1. regression tests for unchanged public contracts
2. tests for the modified behavior
3. discoverability regression tests if any visible contract changed
4. packaging regression tests if startup or distribution changed

### Capability Extension

Must include:

1. success and failure tests for the new capability
2. discoverability tests proving the new capability is listed and documented
3. permission tests if restricted
4. runtime inheritance tests if defaults apply

## Manual Verification Requirements

Automated tests are primary. Manual verification is still required in these cases:

1. `stdio` servers should be checked in MCP Inspector when the change affects tools/resources/templates/prompts visibility.
2. Package execution should be manually sanity-checked if the startup command changed.
3. Docs-driven lookup should be sampled manually when the corpus path handling changed.

Manual checks do not replace automated tests.

## Release Gate

Do not treat the task as complete until all applicable gates are green:

1. Typecheck passes.
2. Automated tests pass.
3. Discoverability surface is coherent.
4. Permission semantics are proven for restricted operations.
5. Startup path is operational.
6. Package dry-run passes when distribution is in scope.
7. Residual risk is explicitly stated if any integration boundary remains unverified.
