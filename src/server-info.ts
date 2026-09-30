/**
 * @file Exports SERVER_INFO, the MCP server name and version reported to clients.
 * @tags mcp-server, server-metadata
 * @related src/contracts.ts
 */
import type { ServerInfo } from "./contracts.js";

export const SERVER_INFO: Readonly<ServerInfo> = {
  name: "mcp-starter",
  version: "0.3.0"
} as const;
