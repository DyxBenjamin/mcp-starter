import { readFile } from "node:fs/promises";
import path from "node:path";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, GetPromptResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import {
  type PermissionLevel,
  type RuntimeDefaults,
  type ServerInfo,
  type ServerOperationMetadata,
  type ServerProfile
} from "./contracts.js";
import { DOCS_INDEX } from "./generated/docs-index.generated.js";
import { TOOL_CATALOG, RESOURCE_CATALOG, PROMPT_CATALOG } from "./generated/catalog.generated.js";
import { OPERATION_METADATA } from "./generated/runtime-contracts.generated.js";
import { hasPermission, resolveRuntimeDefaults } from "./runtime.js";

export interface CreateServerOptions {
  readonly profile?: ServerProfile;
  readonly runtimeDefaults?: Partial<RuntimeDefaults>;
}

const ECHO_INPUT_SCHEMA = {
  message: z.string().min(1).describe("Message to echo."),
  uppercase: z.boolean().optional().default(false).describe("Whether to convert the message to uppercase.")
} as const;

const ADMIN_ECHO_VISIBILITY_SCHEMA = z.object({
  message: z.unknown().optional(),
  page: z.unknown().optional(),
  count: z.unknown().optional(),
  accountSid: z.unknown().optional()
});

const USAGE_GUIDE_INPUT_SCHEMA = {
  goal: z.string().min(1).optional().describe("Optional goal used to tailor the guidance.")
} as const;

const DOC_RESOURCE_TEMPLATE = new ResourceTemplate("app://doc/{slug}", {
  list: undefined,
  complete: {
    slug: async (value) => suggestValues(value, DOCS_INDEX.map((entry) => entry.slug))
  }
});

const SCHEMA_RESOURCE_TEMPLATE = new ResourceTemplate("app://schema/{id}", {
  list: undefined,
  complete: {
    id: async (value) => suggestValues(value, TOOL_CATALOG.map((entry) => entry.operationId))
  }
});

const EXAMPLE_RESOURCE_TEMPLATE = new ResourceTemplate("app://example/{name}", {
  list: undefined,
  complete: {
    name: async (value) =>
      suggestValues(value, [
        ...TOOL_CATALOG.map((entry) => entry.name),
        ...PROMPT_CATALOG.map((entry) => entry.name)
      ])
  }
});

export const SERVER_INFO: Readonly<ServerInfo> = {
  name: "mcp-starter",
  version: "0.2.0"
} as const;

export function createCoreMcpServer(options: CreateServerOptions = {}): McpServer {
  const runtimeDefaults = resolveRuntimeDefaults(options.runtimeDefaults);
  const server = new McpServer({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version
  });

  registerCoreProfile(server, runtimeDefaults, "core");
  return server;
}

export function createMcpServer(options: CreateServerOptions = {}): McpServer {
  const profile = options.profile ?? "operable";
  const runtimeDefaults = resolveRuntimeDefaults(options.runtimeDefaults);
  const server = new McpServer({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version
  });

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
      inputSchema: ECHO_INPUT_SCHEMA
    },
    async ({ message, uppercase }) => ({
      content: [
        {
          type: "text",
          text: uppercase ? message.toUpperCase() : message
        }
      ]
    })
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
      argsSchema: {
        topic: z.string().min(1).describe("Topic to summarize.")
      }
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

function registerOperableProfile(server: McpServer, runtimeDefaults: RuntimeDefaults): void {
  server.registerTool(
    "admin_echo",
    {
      title: "Admin Echo Tool",
      description:
        "Demonstrates permission-first execution, runtime defaults, operation metadata, and 1-based pagination.",
      inputSchema: ADMIN_ECHO_VISIBILITY_SCHEMA
    },
    async (input) => {
      const metadata = getOperationMetadata("admin-echo");
      return runOperation(
        metadata,
        runtimeDefaults,
        input,
        (rawInput) => {
          if (
            typeof rawInput !== "object" ||
            rawInput === null ||
            !("message" in rawInput) ||
            typeof rawInput.message !== "string" ||
            rawInput.message.trim().length === 0
          ) {
            return {
              ok: false,
              error: "message is required"
            } as const;
          }

          const validation = z
            .object({
              page: z.coerce.number().int().min(1).default(runtimeDefaults.defaultPage),
              count: z.coerce.number().int().min(1).max(100).default(runtimeDefaults.defaultCount),
              accountSid: z.string().min(1).optional()
            })
            .safeParse(rawInput);

          if (!validation.success) {
            return {
              ok: false,
              error: validation.error.issues.map((issue) => issue.message).join("; ")
            } as const;
          }

          return {
            ok: true,
            value: {
              message: rawInput.message,
              ...validation.data
            }
          } as const;
        },
        async (validatedInput) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  echoed: validatedInput.message,
                  accountSid: validatedInput.accountSid ?? runtimeDefaults.defaultAccountSid,
                  page: validatedInput.page,
                  count: validatedInput.count,
                  permissionLevel: runtimeDefaults.permissionLevel
                },
                null,
                2
              )
            }
          ]
        })
      );
    }
  );

  for (const resource of RESOURCE_CATALOG.filter((entry) => entry.kind === "fixed")) {
    if (resource.uri === "app://status") {
      continue;
    }

    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType
      },
      async (uri) => readFixedResource(uri.toString(), runtimeDefaults)
    );
  }

  server.registerResource(
    "doc-template",
    DOC_RESOURCE_TEMPLATE,
    {
      title: "Documentation Lookup",
      description: "Read a markdown document from the docs corpus by slug.",
      mimeType: "text/markdown"
    },
    async (uri, variables) => readDocTemplate(uri.toString(), String(variables.slug ?? ""), runtimeDefaults)
  );

  server.registerResource(
    "schema-template",
    SCHEMA_RESOURCE_TEMPLATE,
    {
      title: "Operation Schema Lookup",
      description: "Read generated metadata and contract details for an operation.",
      mimeType: "application/json"
    },
    async (uri, variables) => readSchemaTemplate(uri.toString(), String(variables.id ?? ""), runtimeDefaults)
  );

  server.registerResource(
    "example-template",
    EXAMPLE_RESOURCE_TEMPLATE,
    {
      title: "Example Lookup",
      description: "Read a concrete example for a tool or prompt.",
      mimeType: "application/json"
    },
    async (uri, variables) => readExampleTemplate(uri.toString(), String(variables.name ?? ""), runtimeDefaults)
  );

  server.registerPrompt(
    "server_usage_guide",
    {
      title: "Server Usage Guide",
      description: "Explains the recommended discovery and execution flow for agents.",
      argsSchema: USAGE_GUIDE_INPUT_SCHEMA
    },
    async ({ goal }) => buildUsageGuidePrompt(goal, runtimeDefaults)
  );
}

function getOperationMetadata(operationId: string): ServerOperationMetadata {
  const metadata = OPERATION_METADATA.find((candidate) => candidate.operationId === operationId);
  if (metadata === undefined) {
    throw new Error(`Unknown operation metadata for ${operationId}`);
  }
  return metadata;
}

async function readFixedResource(uri: string, runtimeDefaults: RuntimeDefaults): Promise<ReadResourceResult> {
  switch (uri) {
    case "app://index":
      return jsonResource(uri, buildIndexDocument(runtimeDefaults));
    case "app://catalog/tools":
      return jsonResource(uri, TOOL_CATALOG);
    case "app://catalog/resources":
      return jsonResource(uri, RESOURCE_CATALOG);
    case "app://catalog/prompts":
      return jsonResource(uri, PROMPT_CATALOG);
    case "app://runtime/defaults":
      return jsonResource(uri, runtimeDefaults);
    case "app://usage":
      return textResource(uri, buildUsageMarkdown(runtimeDefaults), "text/markdown");
    default:
      return textResource(uri, `Resource not found: ${uri}`, "text/plain");
  }
}

async function readDocTemplate(
  uri: string,
  slug: string,
  runtimeDefaults: RuntimeDefaults
): Promise<ReadResourceResult> {
  const match = DOCS_INDEX.find((entry) => entry.slug === slug);
  if (match === undefined) {
    return textResource(uri, `Unknown documentation slug: ${slug}`, "text/plain");
  }

  if (!runtimeDefaults.docsAvailable) {
    return textResource(
      uri,
      [
        `Documentation corpus is unavailable at runtime.`,
        `Set MCP_DOCS_DIR to a valid docs corpus path to enable template reads.`,
        `Requested slug: ${slug}`
      ].join("\n"),
      "text/plain"
    );
  }

  const absolutePath = path.join(runtimeDefaults.docsDir, match.localPath);
  try {
    const contents = await readFile(absolutePath, "utf8");
    return textResource(uri, contents, "text/markdown");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return textResource(uri, `Unable to read documentation for ${slug}: ${message}`, "text/plain");
  }
}

async function readSchemaTemplate(
  uri: string,
  operationId: string,
  runtimeDefaults: RuntimeDefaults
): Promise<ReadResourceResult> {
  const entry = TOOL_CATALOG.find((tool) => tool.operationId === operationId);
  if (entry === undefined) {
    return textResource(uri, `Unknown operation id: ${operationId}`, "text/plain");
  }

  return jsonResource(uri, {
    operation: entry,
    runtimeDefaults: entry.supportsRuntimeDefaults
      ? {
          defaultAccountSid: runtimeDefaults.defaultAccountSid,
          defaultRegion: runtimeDefaults.defaultRegion,
          defaultPage: runtimeDefaults.defaultPage,
          defaultCount: runtimeDefaults.defaultCount
        }
      : null
  });
}

async function readExampleTemplate(
  uri: string,
  name: string,
  runtimeDefaults: RuntimeDefaults
): Promise<ReadResourceResult> {
  const tool = TOOL_CATALOG.find((entry) => entry.name === name);
  if (tool !== undefined) {
    return jsonResource(uri, {
      kind: "tool",
      name,
      examples: tool.examples,
      requiresRuntimeContext: tool.requiresRuntimeContext,
      runtimeDefaults: tool.supportsRuntimeDefaults
        ? {
            defaultAccountSid: runtimeDefaults.defaultAccountSid,
            defaultPage: runtimeDefaults.defaultPage,
            defaultCount: runtimeDefaults.defaultCount
          }
        : null
    });
  }

  const prompt = PROMPT_CATALOG.find((entry) => entry.name === name);
  if (prompt !== undefined) {
    return jsonResource(uri, {
      kind: "prompt",
      name,
      examples: prompt.examples,
      usageIntent: prompt.usageIntent
    });
  }

  return textResource(uri, `Unknown example target: ${name}`, "text/plain");
}

function buildIndexDocument(runtimeDefaults: RuntimeDefaults): Record<string, unknown> {
  return {
    server: SERVER_INFO,
    recommendedProfile: "operable",
    discoveryOrder: [
      "app://index",
      "app://catalog/tools",
      "app://catalog/resources",
      "app://catalog/prompts",
      "app://runtime/defaults",
      "app://usage"
    ],
    tools: TOOL_CATALOG.map((tool) => ({
      name: tool.name,
      operationId: tool.operationId,
      minimumPermissionLevel: tool.minimumPermissionLevel,
      requiresRuntimeContext: tool.requiresRuntimeContext
    })),
    resources: RESOURCE_CATALOG.map((resource) => ({
      uri: resource.uri,
      kind: resource.kind,
      title: resource.title
    })),
    prompts: PROMPT_CATALOG.map((prompt) => ({
      name: prompt.name,
      title: prompt.title
    })),
    runtime: {
      docsAvailable: runtimeDefaults.docsAvailable,
      permissionLevel: runtimeDefaults.permissionLevel,
      sourceModeCommand: runtimeDefaults.sourceModeCommand,
      packageModeCommand: runtimeDefaults.packageModeCommand
    }
  };
}

function buildUsageMarkdown(runtimeDefaults: RuntimeDefaults): string {
  return [
    "# Usage Guide",
    "",
    "1. Read `app://index` before making non-trivial tool calls.",
    "2. Read `app://catalog/tools` to understand visibility vs usability, examples, and permission requirements.",
    "3. Read `app://runtime/defaults` before doing discovery calls for account, region, or pagination defaults.",
    "4. Pagination is 1-based when a tool declares `page-count-1-based`.",
    "5. For source-mode local development use the source command; for published usage prefer the package command.",
    "",
    `- Current permission level: ${runtimeDefaults.permissionLevel}`,
    `- Default page: ${runtimeDefaults.defaultPage}`,
    `- Default count: ${runtimeDefaults.defaultCount}`,
    `- Docs available: ${runtimeDefaults.docsAvailable}`,
    `- Source mode: ${runtimeDefaults.sourceModeCommand}`,
    `- Package mode: ${runtimeDefaults.packageModeCommand}`,
    "",
    "Permission failures are returned semantically by handlers before endpoint-specific business validation when supported by the tool."
  ].join("\n");
}

function buildUsageGuidePrompt(goal: string | undefined, runtimeDefaults: RuntimeDefaults): GetPromptResult {
  const goalLine = goal === undefined ? "No explicit goal was provided." : `Goal: ${goal}`;
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Use this MCP server with the following flow:",
            "1. Read app://index.",
            "2. Read app://catalog/tools and app://runtime/defaults.",
            "3. Only call tools after checking permission requirements and defaults.",
            "4. Treat pagination as 1-based when declared.",
            goalLine,
            `Current runtime permission level: ${runtimeDefaults.permissionLevel}.`,
            `Preferred source mode: ${runtimeDefaults.sourceModeCommand}.`,
            `Preferred package mode: ${runtimeDefaults.packageModeCommand}.`
          ].join("\n")
        }
      }
    ]
  };
}

function runOperation<TValidated>(
  metadata: ServerOperationMetadata,
  runtimeDefaults: RuntimeDefaults,
  rawInput: unknown,
  validate: (input: unknown) => { ok: true; value: TValidated } | { ok: false; error: string },
  execute: (validatedInput: TValidated) => Promise<CallToolResult>
): Promise<CallToolResult> {
  if (!hasPermission(runtimeDefaults.permissionLevel, metadata.minimumPermissionLevel)) {
    return Promise.resolve(permissionDeniedResult(metadata, runtimeDefaults.permissionLevel));
  }

  const validation = validate(rawInput);
  if (!validation.ok) {
    return Promise.resolve(toolErrorResult(`Validation failed: ${validation.error}`));
  }

  return execute(validation.value);
}

function permissionDeniedResult(
  metadata: ServerOperationMetadata,
  currentLevel: PermissionLevel
): CallToolResult {
  return toolErrorResult(
    `Permission denied for ${metadata.operationId}. Required=${metadata.minimumPermissionLevel}; current=${currentLevel}.`
  );
}

function toolErrorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: message
      }
    ]
  };
}

function jsonResource(uri: string, payload: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function textResource(uri: string, text: string, mimeType: string): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType,
        text
      }
    ]
  };
}

function suggestValues(input: string, values: readonly string[]): string[] {
  const normalized = input.toLowerCase();
  return values.filter((value) => value.toLowerCase().includes(normalized)).slice(0, 20);
}
