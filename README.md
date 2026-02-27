# MCP Starter

Minimal TypeScript MCP server starter with stdio transport, protocol documentation sync tooling, and a reusable `mcp-builder` skill.

## Commands

- `npm run dev`: Start the MCP server with stdio transport.
- `npx tsx src/index.ts`: Run the MCP server directly with npx.
- `npm run typecheck`: Run TypeScript validation.
- `npm test`: Run deterministic unit tests.
- `npm run protocol:sync`: Download MCP protocol docs into `docs/protocol`.
- `npm run inspect`: Launch MCP Inspector against this local server.
- `npm run inspect:help`: Show Inspector CLI options.

## Extending the server

- Main extension point: `src/server.ts`.
- Add tools/resources/prompts to the `McpServer` instance created by `createMcpServer`.
- Runtime entrypoint: `src/index.ts`.

## Included MCP capabilities

- Tool: `echo`
  - Inputs: `message` (`string`), `uppercase` (`boolean`, optional)
  - Behavior: returns input text, optionally uppercased.
- Resource: `app://status`
  - Returns JSON status payload with server metadata and enabled capability categories.
- Prompt: `summarize`
  - Input argument: `topic` (`string`)
  - Returns a ready-to-use user message template for concise summarization.

## Skill

- Skill location: `skills/mcp-builder`.
- Use `$mcp-builder` to create, edit, and extend MCP servers with test gates.

## MCP DevTools Integration

This starter includes integration with **MCP Inspector** (official devtool for testing/debugging MCP servers).

1. Run `npm run inspect`.
2. Open the Inspector URL shown in terminal.
3. Connect and inspect tools/resources/prompts exposed by the server.
