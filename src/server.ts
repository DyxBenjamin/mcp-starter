import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

export const SERVER_INFO: Readonly<ServerInfo> = {
  name: "mcp-starter",
  version: "0.1.0"
} as const;

export function createMcpServer(): McpServer {
  return new McpServer({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version
  });
}
