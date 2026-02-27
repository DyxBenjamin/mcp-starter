# MCP Server Test Matrix

## Goal

Guarantee correctness of capability contracts, startup lifecycle, and error boundaries.

## Core Test Categories

1. Factory tests:
   - returns MCP server instance,
   - metadata constants are stable.
2. Startup tests:
   - transport connect is invoked exactly once,
   - startup failure sets non-zero exit semantics.
3. Capability contract tests:
   - valid request path,
   - invalid schema path,
   - domain failure path.
4. Regression tests:
   - existing capability signatures remain compatible.

## Minimum Assertions Per Capability

1. Input validation rejects malformed payload.
2. Success path returns deterministic shape.
3. Error path returns deterministic error contract.
4. Side effects are isolated and mockable.

## Transport Validation

1. `stdio` mode:
   - boot does not throw under mocked runtime,
   - transport wiring stays in entrypoint.
   - manual verification through MCP Inspector for capability discovery.
2. HTTP mode (if applicable):
   - request lifecycle and cancellation behavior are tested,
   - timeout and error boundaries are explicit.

## Reliability Gate

Release only when all of the following pass:

1. Typecheck.
2. Unit tests.
3. Contract tests for modified capabilities.
4. Smoke startup for selected transport.
