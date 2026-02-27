# Extend MCP Server

## Objective

Add new MCP capabilities with explicit schemas, predictable behavior, and regression safety.

## Extension Types

1. Tools:
   - deterministic handlers,
   - explicit input/output schemas,
   - clear failure semantics.
2. Resources:
   - stable URI patterns,
   - immutable or versioned payload strategy.
3. Prompts:
   - deterministic template contract,
   - explicit variable requirements.

## Extension Procedure

1. Define capability contract first:
   - name/identifier,
   - schema,
   - expected success and failure responses.
2. Implement handler with strict input narrowing.
3. Register capability in the server factory.
4. Add tests for:
   - valid payload execution,
   - schema violation path,
   - internal error path.
5. Document new contract in project docs or changelog notes.

## Error Handling Rules

1. Never leak raw internal stack traces as user-facing payload.
2. Return structured, consistent errors.
3. Keep transport-level failures isolated from handler logic.

## Versioning Guidance

1. Non-breaking additions can keep the current minor line.
2. Contract-breaking changes require explicit version bump strategy and migration notes.
