/**
 * @file Builds McpServer instances per profile with the echo tool, status resource and summarize prompt, plus list cache hints.
 * @tags mcp-server, server-profile, tool-registration
 * @related src/operable-profile.ts, src/contracts.ts, tests/starter-server.spec.ts
 */
import { McpServer, type ServerOptions } from "@modelcontextprotocol/server";
import * as z from "zod";
import type { RuntimeDefaults, ServerProfile } from "./contracts.js";
import { registerOperableProfile } from "./operable-profile.js";
import { jsonResource } from "./results.js";
import { resolveRuntimeDefaults } from "./runtime.js";
import { SERVER_INFO } from "./server-info.js";

export { SERVER_INFO } from "./server-info.js";

export interface CreateServerOptions {
  readonly profile?: ServerProfile;
  readonly runtimeDefaults?: Partial<RuntimeDefaults>;
}

const ECHO_INPUT_SCHEMA = z.object({
  message: z.string().min(1).describe("Message to echo."),
  uppercase: z.boolean().optional().default(false).describe("Whether to convert the message to uppercase.")
});

const ECHO_OUTPUT_SCHEMA = z.object({
  echoed: z.string().describe("The echoed message after the optional transformation.")
});

/** Catalog listings are static per build, so 2026-07-28 clients and shared caches may reuse them for a minute. */
const SERVER_OPTIONS: ServerOptions = {
  cacheHints: {
    "tools/list": { ttlMs: 60_000, cacheScope: "public" },
    "prompts/list": { ttlMs: 60_000, cacheScope: "public" },
    "resources/list": { ttlMs: 60_000, cacheScope: "public" },
    "resources/templates/list": { ttlMs: 60_000, cacheScope: "public" }
  }
};

export function createCoreMcpServer(options: CreateServerOptions = {}): McpServer {
  const runtimeDefaults = resolveRuntimeDefaults(options.runtimeDefaults);
  const server = new McpServer(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version
    },
    SERVER_OPTIONS
  );

  registerCoreProfile(server, runtimeDefaults, "core");
  return server;
}

export function createMcpServer(options: CreateServerOptions = {}): McpServer {
  const profile = options.profile ?? "operable";
  const runtimeDefaults = resolveRuntimeDefaults(options.runtimeDefaults);
  const server = new McpServer(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version
    },
    SERVER_OPTIONS
  );

  registerCoreProfile(server, runtimeDefaults, profile);
  if (profile === "operable") {
    registerOperableProfile(server, runtimeDefaults);
  }

  return server;
}

function registerCoreProfile(server: McpServer, runtimeDefaults: RuntimeDefaults, profile: ServerProfile): void {
  server.registerTool(
    "echo",
    {
      title: "Echo Tool",
      description: "Echoes a message and supports optional uppercase transformation.",
      inputSchema: ECHO_INPUT_SCHEMA,
      outputSchema: ECHO_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ message, uppercase }) => {
      const echoed = uppercase ? message.toUpperCase() : message;
      return {
        content: [{ type: "text", text: echoed }],
        structuredContent: { echoed }
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
    async (uri) =>
      jsonResource(uri.toString(), {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        profile,
        status: "ok",
        capabilities: ["tools", "resources", "prompts"],
        runtime: {
          permissionLevel: runtimeDefaults.permissionLevel,
          docsAvailable: runtimeDefaults.docsAvailable
        }
      })
  );

  server.registerPrompt(
    "summarize",
    {
      title: "Summarize Prompt",
      description: "Prompt template to summarize a specific topic or document.",
      argsSchema: z.object({
        topic: z.string().min(1).describe("Topic to summarize.")
      })
    },
    async ({ topic }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Summarize the following topic in concise bullet points with key risks and next steps:\n\n${topic}`
          }
        }
      ]
    })
  );
}
