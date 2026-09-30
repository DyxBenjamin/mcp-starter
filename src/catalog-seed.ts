import type {
  PromptCatalogEntry,
  ResourceCatalogEntry,
  RuntimeDefaults,
  ToolCatalogEntry
} from "./contracts.js";

export const RUNTIME_DEFAULTS_TEMPLATE: Readonly<RuntimeDefaults> = {
  defaultAccountSid: null,
  defaultServiceProviderSid: null,
  defaultRegion: "us-central",
  defaultPage: 1,
  defaultCount: 25,
  docsDir: "./docs/protocol",
  docsAvailable: false,
  docsManifestPath: "./docs/protocol/manifest.json",
  environment: "development",
  permissionLevel: "read",
  sourceModeCommand: "npx tsx src/index.ts",
  packageModeCommand: "npx -y mcp-starter"
} as const;

export const TOOL_CATALOG_SEED: readonly ToolCatalogEntry[] = [
  {
    operationId: "echo",
    name: "echo",
    title: "Echo Tool",
    description: "Echoes a message and optionally transforms it to uppercase.",
    minimumPermissionLevel: "none",
    sensitivity: "public",
    supportsRuntimeDefaults: false,
    paginationMode: "none",
    docsAvailability: "optional",
    inputFields: [
      {
        name: "message",
        description: "Message to return to the caller.",
        required: true
      },
      {
        name: "uppercase",
        description: "When true, converts the message to uppercase before returning it.",
        required: false
      }
    ],
    examples: [
      {
        name: "uppercase echo",
        input: {
          message: "hello",
          uppercase: true
        },
        expectedText: "HELLO"
      }
    ],
    usageNotes: [
      "Use this tool as a known-good connectivity check before adding real business operations.",
      "This tool has no runtime dependencies and can be used from the core profile."
    ],
    requiresRuntimeContext: false,
    docs: ["docs-2026-07-28-learn-server-concepts", "docs-2026-07-28-sdk"]
  },
  {
    operationId: "admin-echo",
    name: "admin_echo",
    title: "Admin Echo Tool",
    description: "Demonstrates permission-first execution, runtime defaults, and 1-based pagination semantics.",
    minimumPermissionLevel: "write",
    sensitivity: "internal",
    supportsRuntimeDefaults: true,
    paginationMode: "page-count-1-based",
    docsAvailability: "optional",
    inputFields: [
      {
        name: "message",
        description: "Business payload validated after the permission gate.",
        required: true
      },
      {
        name: "page",
        description: "1-based page number. Defaults to runtime `defaultPage`.",
        required: false
      },
      {
        name: "count",
        description: "Page size. Defaults to runtime `defaultCount`.",
        required: false
      },
      {
        name: "accountSid",
        description: "Optional account identifier. Falls back to runtime `defaultAccountSid` when available.",
        required: false
      }
    ],
    examples: [
      {
        name: "runtime-backed admin echo",
        input: {
          message: "deploy",
          page: 1,
          count: 25
        },
        expectedText: "deploy"
      }
    ],
    usageNotes: [
      "This tool stays visible to agents even when the caller lacks permission.",
      "Permission is evaluated before endpoint-specific validation to avoid misleading schema errors.",
      "This tool demonstrates how hidden runtime defaults become MCP-visible through catalog resources."
    ],
    requiresRuntimeContext: true,
    docs: ["docs-2026-07-28-develop-build-server", "docs-2026-07-28-tools-inspector", "specification-2026-07-28-server-discover"]
  }
] as const;

export const RESOURCE_CATALOG_SEED: readonly ResourceCatalogEntry[] = [
  {
    name: "status",
    title: "Server Status",
    kind: "fixed",
    uri: "app://status",
    description: "Server metadata and active profile summary.",
    mimeType: "application/json",
    examples: ["app://status"],
    usageNotes: ["Use as a quick liveness and capability signal."],
    docs: ["docs-2026-07-28-sdk"]
  },
  {
    name: "index",
    title: "Server Index",
    kind: "fixed",
    uri: "app://index",
    description: "Top-level discovery resource listing tools, resources, prompts, runtime behavior, and execution modes.",
    mimeType: "application/json",
    examples: ["app://index"],
    usageNotes: ["Agents should read this before making non-trivial tool calls."],
    docs: ["docs-2026-07-28-learn-server-concepts"]
  },
  {
    name: "catalog-tools",
    title: "Tool Catalog",
    kind: "fixed",
    uri: "app://catalog/tools",
    description: "Tool catalog with examples, permission semantics, and runtime-default usage notes.",
    mimeType: "application/json",
    examples: ["app://catalog/tools"],
    usageNotes: ["Use this to separate visible tools from safely callable tools."],
    docs: ["docs-2026-07-28-learn-server-concepts"]
  },
  {
    name: "catalog-resources",
    title: "Resource Catalog",
    kind: "fixed",
    uri: "app://catalog/resources",
    description: "Lists fixed resources and resource templates with examples.",
    mimeType: "application/json",
    examples: ["app://catalog/resources"],
    usageNotes: ["Read this before using resource templates."],
    docs: ["docs-2026-07-28-learn-server-concepts"]
  },
  {
    name: "catalog-prompts",
    title: "Prompt Catalog",
    kind: "fixed",
    uri: "app://catalog/prompts",
    description: "Prompt index with intent and required arguments.",
    mimeType: "application/json",
    examples: ["app://catalog/prompts"],
    usageNotes: ["Use to understand when prompts are scaffolding versus domain prompts."],
    docs: ["docs-2026-07-28-learn-server-concepts"]
  },
  {
    name: "runtime-defaults",
    title: "Runtime Defaults",
    kind: "fixed",
    uri: "app://runtime/defaults",
    description: "Exposes environment-derived defaults and operational commands to agents.",
    mimeType: "application/json",
    examples: ["app://runtime/defaults"],
    usageNotes: ["Use this instead of discovery tool calls when defaults already exist."],
    docs: ["docs-2026-07-28-develop-connect-local-servers"]
  },
  {
    name: "usage",
    title: "Usage Guide",
    kind: "fixed",
    uri: "app://usage",
    description: "Operational conventions including pagination, permission semantics, docs availability, and execution modes.",
    mimeType: "text/markdown",
    examples: ["app://usage"],
    usageNotes: ["This is the human-readable operational quickstart."],
    docs: ["docs-2026-07-28-tools-inspector"]
  },
  {
    name: "doc-template",
    title: "Documentation Lookup",
    kind: "template",
    uri: "app://doc/{slug}",
    description: "Read a markdown document from the docs corpus by generated slug.",
    mimeType: "text/markdown",
    examples: ["app://doc/docs-sdk"],
    usageNotes: ["Use `app://catalog/resources` to find valid slugs if unsure."],
    docs: ["docs-2026-07-28-getting-started-intro"]
  },
  {
    name: "schema-template",
    title: "Operation Schema Lookup",
    kind: "template",
    uri: "app://schema/{id}",
    description: "Read the generated operation metadata and input contract for a specific operation id.",
    mimeType: "application/json",
    examples: ["app://schema/admin-echo"],
    usageNotes: ["Use operation ids from the tool catalog."],
    docs: ["docs-2026-07-28-sdk"]
  },
  {
    name: "example-template",
    title: "Example Lookup",
    kind: "template",
    uri: "app://example/{name}",
    description: "Read a concrete example payload for a named tool or prompt.",
    mimeType: "application/json",
    examples: ["app://example/admin_echo"],
    usageNotes: ["Prefer examples before first call when a tool has runtime defaults or permissions."],
    docs: ["docs-2026-07-28-tools-inspector"]
  }
] as const;

export const PROMPT_CATALOG_SEED: readonly PromptCatalogEntry[] = [
  {
    name: "summarize",
    title: "Summarize Prompt",
    description: "Prompt template that asks a model to summarize a topic with risks and next steps.",
    args: [
      {
        name: "topic",
        description: "Topic or document subject to summarize.",
        required: true
      }
    ],
    usageIntent: "Use for domain summaries after a resource read or a tool result.",
    examples: ["summarize(topic=\"MCP adoption plan\")"],
    docs: ["docs-2026-07-28-learn-client-concepts"]
  },
  {
    name: "server_usage_guide",
    title: "Server Usage Guide",
    description: "Prompt that teaches an agent how to discover and use this server correctly.",
    args: [
      {
        name: "goal",
        description: "Optional task goal to tailor the usage guide.",
        required: false
      }
    ],
    usageIntent: "Use before first interaction or when handing the server to another agent.",
    examples: ["server_usage_guide(goal=\"integrate an admin workflow\")"],
    docs: ["docs-2026-07-28-tools-inspector", "docs-2026-07-28-develop-build-server"]
  }
] as const;
