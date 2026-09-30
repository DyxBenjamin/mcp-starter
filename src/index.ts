#!/usr/bin/env node
/**
 * @file CLI entry point: exports startServer, which serves the operable MCP server over stdio, and handles shutdown signals.
 * @tags cli, stdio-transport, mcp-server
 * @related src/server.ts, tests/starter-server.spec.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServerFactory } from "@modelcontextprotocol/server";
import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { createMcpServer } from "./server.js";

export type ServeFunction = (factory: McpServerFactory) => StdioServerHandle;

export interface StartServerDependencies {
  readonly createServer?: McpServerFactory;
  readonly serve?: ServeFunction;
}

/**
 * Serves the MCP server over stdio for both protocol eras: `server/discover` (2026-07-28)
 * and the `initialize` handshake (2025-11-25 and earlier).
 */
export function startServer(dependencies: StartServerDependencies = {}): StdioServerHandle {
  const createServer = dependencies.createServer ?? (() => createMcpServer({ profile: "operable" }));
  const serve = dependencies.serve ?? serveStdio;
  return serve(createServer);
}

function main(): void {
  try {
    const handle = startServer();
    const shutdown = (): void => {
      void handle.close();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Failed to start MCP server: ${message}\n`);
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === currentFilePath) {
  main();
}
