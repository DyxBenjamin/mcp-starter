# Edit MCP Server

## Objective

Refactor or patch an existing MCP server while preserving contract compatibility.

## Safe Edit Workflow

1. Map current server boundaries:
   - factory function,
   - transport wiring,
   - capability registrations.
2. Catalog externally visible contracts:
   - tool names,
   - resource URIs,
   - prompt IDs,
   - version fields.
3. Define target change and compatibility requirements before editing code.
4. Apply the smallest possible mutation that satisfies the requested behavior.
5. Re-run all contract tests and smoke checks.

## Compatibility Rules

1. Do not rename public tool/resource/prompt identifiers unless explicitly requested.
2. Keep schema fields backward-compatible when possible.
3. Treat server metadata changes as potentially breaking.
4. Preserve transport behavior unless transport migration is part of scope.

## Refactor Guardrails

1. Move business logic into pure functions when feasible.
2. Isolate external I/O behind adapters to simplify tests.
3. Keep process-level behavior in entrypoint only.

## Validation Requirements

1. Existing tests must pass unchanged.
2. New behavior must include positive and negative tests.
3. Startup path must continue to connect through the selected transport.
