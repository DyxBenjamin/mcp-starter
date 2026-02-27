# Create MCP Server

## Objective

Create a new MCP server with a stable composition boundary and deterministic startup behavior.

## Baseline Structure

1. Create a server factory module that returns the MCP server instance.
2. Create a runtime entrypoint module that wires transport and process-level error handling.
3. Keep side effects out of the factory module.

## Required Decisions

1. Transport:
   - `stdio` for local integrations and command-line workflows.
   - Streamable HTTP for remote or shared environments.
2. Module system:
   - Use ESM by default.
3. Type safety:
   - Enable strict TypeScript mode and prohibit `any`.

## Minimal Factory Contract

1. Export immutable server metadata (`name`, `version`).
2. Export `createMcpServer()` returning the SDK server object.
3. Keep default capabilities empty until explicitly requested.

## Startup Contract

1. Instantiate server from the factory.
2. Instantiate transport.
3. Connect server to transport.
4. Emit deterministic error output and set non-zero process exit on failure.

## Acceptance Checklist

1. Server starts through the configured transport.
2. Typecheck passes with strict settings.
3. Unit tests assert factory output type and startup connection path.
