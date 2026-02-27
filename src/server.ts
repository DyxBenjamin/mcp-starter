import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

export const SERVER_INFO: Readonly<ServerInfo> = {
  name: "mcp-starter",
  version: "0.1.0"
} as const;

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version
  });

  server.registerTool(
    "echo",
    {
      title: "Echo Tool",
      description: "Echoes a message and supports optional uppercase transformation.",
      inputSchema: {
        message: z.string().min(1).describe("Message to echo."),
        uppercase: z.boolean().optional().default(false).describe("Whether to convert the message to uppercase.")
      }
    },
    async ({ message, uppercase }) => {
      const value = uppercase ? message.toUpperCase() : message;
      return {
        content: [
          {
            type: "text",
            text: value
          }
        ]
      };
    }
  );

  server.registerResource(
    "status",
    "app://status",
    {
      title: "Server Status",
      description: "Returns basic runtime metadata and capability status.",
      mimeType: "application/json"
    },
    async (uri) => {
      const payload = {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        status: "ok",
        capabilities: ["tools", "resources", "prompts"]
      } as const;

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }
  );

  server.registerPrompt(
    "summarize",
    {
      title: "Summarize Prompt",
      description: "Prompt template to summarize a specific topic or document.",
      argsSchema: {
        topic: z.string().min(1).describe("Topic to summarize.")
      }
    },
    async ({ topic }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Summarize the following topic in concise bullet points with key risks and next steps:\n\n${topic}`
            }
          }
        ]
      };
    }
  );

  return server;
}
