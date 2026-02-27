import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
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

  it("exposes tool, resource, and prompt capabilities end-to-end", async () => {
    const server = createMcpServer();
    const client = new Client({
      name: "mcp-starter-test-client",
      version: "0.1.0"
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "echo")).toBe(true);

    const toolResult = await client.callTool(
      {
        name: "echo",
        arguments: {
          message: "hello",
          uppercase: true
        }
      },
      CallToolResultSchema
    );
    const parsedToolResult = CallToolResultSchema.parse(toolResult);
    const toolText = parsedToolResult.content.find((item: { type: string }) => item.type === "text");
    expect(toolText?.type).toBe("text");
    if (toolText?.type === "text") {
      expect(toolText.text).toBe("HELLO");
    }

    const resources = await client.listResources();
    expect(resources.resources.some((resource) => resource.uri === "app://status")).toBe(true);

    const resourceResult = await client.readResource({
      uri: "app://status"
    });
    const resourceJson = resourceResult.contents.find((content) => content.uri === "app://status");
    expect(resourceJson).toBeDefined();
    if (resourceJson !== undefined && "text" in resourceJson) {
      const parsed = JSON.parse(resourceJson.text) as {
        name: string;
        version: string;
        status: string;
        capabilities: string[];
      };
      expect(parsed.name).toBe("mcp-starter");
      expect(parsed.status).toBe("ok");
      expect(parsed.capabilities).toContain("tools");
    }

    const prompts = await client.listPrompts();
    expect(prompts.prompts.some((prompt) => prompt.name === "summarize")).toBe(true);

    const promptResult = await client.getPrompt({
      name: "summarize",
      arguments: {
        topic: "MCP adoption plan"
      }
    });
    expect(promptResult.messages.length).toBeGreaterThan(0);
    const firstMessage = promptResult.messages[0];
    expect(firstMessage).toBeDefined();
    if (firstMessage === undefined) {
      throw new Error("Expected at least one prompt message.");
    }
    expect(firstMessage.role).toBe("user");
    if (firstMessage.content.type === "text") {
      expect(firstMessage.content.text).toContain("MCP adoption plan");
    }

    await client.close();
    await server.close();
  });
});
