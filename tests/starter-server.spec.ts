import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { describe, expect, it } from "vitest";
import { startServer } from "../src/index.js";
import { SERVER_INFO, createMcpServer } from "../src/server.js";

describe("mcp starter server", () => {
  it("creates a MCP server instance with stable metadata constants", () => {
    const server = createMcpServer();

    expect(server).toBeInstanceOf(McpServer);
    expect(SERVER_INFO).toEqual({
      name: "mcp-starter",
      version: "0.1.0"
    });
  });

  it("starts server with injected transport boundary", async () => {
    const receivedTransports: StdioServerTransport[] = [];
    const fakeServer = {
      async connect(transport: StdioServerTransport): Promise<void> {
        receivedTransports.push(transport);
      }
    };
    const fakeTransport = {} as StdioServerTransport;

    await startServer({
      createServer: () => fakeServer,
      createTransport: () => fakeTransport
    });

    expect(receivedTransports).toEqual([fakeTransport]);
  });
});
