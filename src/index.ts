import path from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

export interface ConnectableServer {
  connect(transport: StdioServerTransport): Promise<void>;
}

export interface StartServerDependencies {
  readonly createServer?: () => ConnectableServer;
  readonly createTransport?: () => StdioServerTransport;
}

export async function startServer(dependencies: StartServerDependencies = {}): Promise<void> {
  const server = dependencies.createServer?.() ?? createMcpServer();
  const transport = dependencies.createTransport?.() ?? new StdioServerTransport();
  await server.connect(transport);
}

async function main(): Promise<void> {
  try {
    await startServer();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Failed to start MCP server: ${message}\n`);
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === currentFilePath) {
  void main();
}
