---
name: mcp-builder
description: Build, edit, and extend Model Context Protocol (MCP) servers with deterministic TypeScript workflows, strict typing, and test gates. Use when creating a new MCP server, refactoring an existing MCP server, adding tools/resources/prompts, migrating transports (stdio or Streamable HTTP), or hardening MCP contract behavior with automated tests.
---

# MCP Builder

## Overview

Execute a reproducible MCP server delivery flow with explicit interface boundaries and regression controls. Keep implementation strict, test-first, and transport-aware.

## Workflow

1. Inspect the current codebase and lock constraints.
2. Select target transport and runtime boundary.
3. Implement or update server composition.
4. Add or update MCP capabilities with schema validation.
5. Execute validation gates and report deterministic outcomes.

## Step 1: Inspect and Lock Scope

- Identify runtime (`Node.js`, `Deno`, other), module format (ESM/CJS), and package manager.
- Locate current MCP entrypoints and transport adapters.
- Extract public contracts that must remain compatible (tool names, schema keys, response shapes).
- Load only the required reference file:
  - New server: `references/create-server.md`
  - Existing server mutation: `references/edit-server.md`
  - Capability expansion: `references/extend-server.md`
  - Validation design: `references/test-matrix.md`

## Step 2: Select Runtime Boundary

- Use `stdio` for local tool-host integration and CLI-first workflows.
- Use Streamable HTTP only when remote access or shared server hosting is required.
- Isolate server construction in a factory function to keep tests transport-agnostic.
- Keep side effects in the process entrypoint only.

## Step 3: Implement or Refactor Safely

- Model public payloads with `interface` and strict runtime validation.
- Keep `any` banned; use `unknown` with explicit narrowing.
- Preserve backward-compatible names and versions unless a breaking change is explicitly requested.
- Keep handlers deterministic and isolate external I/O behind injectable adapters.

## Step 4: Extend MCP Capabilities

- Add tools with explicit input/output schemas.
- Add resources with stable URIs and deterministic content resolution.
- Add prompts with versioned intent and narrow variable contracts.
- Update capability tests immediately after each new handler.

## Step 5: Validate and Ship

- Run typecheck and test suites before reporting completion.
- Verify transport boot in a smoke test using a mocked boundary.
- Fail delivery if contract tests or schema guards are missing.
- Summarize residual risks and untested integration boundaries.

## Validation Gates

- `Typecheck`: strict pass with zero `any`.
- `Unit tests`: capability contracts, error paths, and transport smoke paths.
- `Regression`: unchanged behavior for legacy handlers.
- `Operational`: startup failure emits deterministic error output and non-zero exit.

## Deliverables

- Updated implementation files.
- Updated tests proving new behavior and compatibility constraints.
- Concise change notes including new contracts, migration impact, and rollback path.
