import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { startServer } from "../src/index.js";
import { SERVER_INFO, createCoreMcpServer, createMcpServer } from "../src/server.js";

describe("mcp starter server", () => {
  it("creates a MCP server instance with stable metadata constants", () => {
    const server = createCoreMcpServer();

    expect(server).toBeInstanceOf(McpServer);
    expect(SERVER_INFO).toEqual({
      name: "mcp-starter",
      version: "0.2.0"
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

  it("exposes operable discovery resources, templates, and prompts", async () => {
    const server = createMcpServer({
      runtimeDefaults: {
        defaultAccountSid: "AC123",
        defaultServiceProviderSid: "SP123",
        defaultRegion: "mx-central",
        defaultPage: 1,
        defaultCount: 25,
        permissionLevel: "read",
        docsAvailable: true
      }
    });
    const client = new Client({
      name: "mcp-starter-test-client",
      version: "0.2.0"
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "echo")).toBe(true);
    expect(tools.tools.some((tool) => tool.name === "admin_echo")).toBe(true);

    const resources = await client.listResources();
    expect(resources.resources.some((resource) => resource.uri === "app://index")).toBe(true);
    expect(resources.resources.some((resource) => resource.uri === "app://runtime/defaults")).toBe(true);

    const templates = await client.listResourceTemplates();
    expect(templates.resourceTemplates.some((resource) => resource.uriTemplate === "app://doc/{slug}")).toBe(true);
    expect(templates.resourceTemplates.some((resource) => resource.uriTemplate === "app://schema/{id}")).toBe(true);
    expect(templates.resourceTemplates.some((resource) => resource.uriTemplate === "app://example/{name}")).toBe(true);

    const prompts = await client.listPrompts();
    expect(prompts.prompts.some((prompt) => prompt.name === "summarize")).toBe(true);
    expect(prompts.prompts.some((prompt) => prompt.name === "server_usage_guide")).toBe(true);

    const echoResult = CallToolResultSchema.parse(
      await client.callTool(
        {
          name: "echo",
          arguments: {
            message: "hello",
            uppercase: true
          }
        },
        CallToolResultSchema
      )
    );
    const echoText = echoResult.content.find((item: { type: string }) => item.type === "text");
    expect(echoText).toBeDefined();
    if (echoText?.type === "text") {
      expect(echoText.text).toBe("HELLO");
    }

    const deniedResult = CallToolResultSchema.parse(
      await client.callTool(
        {
          name: "admin_echo",
          arguments: {}
        },
        CallToolResultSchema
      )
    );
    expect(deniedResult.isError).toBe(true);
    const deniedText = deniedResult.content.find((item: { type: string }) => item.type === "text");
    expect(deniedText).toBeDefined();
    if (deniedText?.type === "text") {
      expect(deniedText.text).toContain("Permission denied");
    }

    const runtimeDefaultsResult = await client.readResource({
      uri: "app://runtime/defaults"
    });
    const runtimeResource = runtimeDefaultsResult.contents.find((content) => content.uri === "app://runtime/defaults");
    expect(runtimeResource).toBeDefined();
    if (runtimeResource !== undefined && "text" in runtimeResource) {
      const parsed = JSON.parse(runtimeResource.text) as {
        defaultAccountSid: string | null;
        permissionLevel: string;
        defaultRegion: string;
      };
      expect(parsed.defaultAccountSid).toBe("AC123");
      expect(parsed.permissionLevel).toBe("read");
      expect(parsed.defaultRegion).toBe("mx-central");
    }

    const usageResult = await client.readResource({
      uri: "app://usage"
    });
    const usageText = usageResult.contents.find((content) => content.uri === "app://usage");
    expect(usageText).toBeDefined();
    if (usageText !== undefined && "text" in usageText) {
      expect(usageText.text).toContain("1-based");
      expect(usageText.text).toContain("Permission failures");
    }

    const schemaResult = await client.readResource({
      uri: "app://schema/admin-echo"
    });
    const schemaResource = schemaResult.contents.find((content) => content.uri === "app://schema/admin-echo");
    expect(schemaResource).toBeDefined();
    if (schemaResource !== undefined && "text" in schemaResource) {
      const parsed = JSON.parse(schemaResource.text) as {
        operation: {
          operationId: string;
          minimumPermissionLevel: string;
        };
      };
      expect(parsed.operation.operationId).toBe("admin-echo");
      expect(parsed.operation.minimumPermissionLevel).toBe("write");
    }

    const exampleResult = await client.readResource({
      uri: "app://example/admin_echo"
    });
    const exampleResource = exampleResult.contents.find((content) => content.uri === "app://example/admin_echo");
    expect(exampleResource).toBeDefined();
    if (exampleResource !== undefined && "text" in exampleResource) {
      const parsed = JSON.parse(exampleResource.text) as {
        kind: string;
        examples: { name: string }[];
      };
      expect(parsed.kind).toBe("tool");
      expect(parsed.examples[0]?.name).toBe("runtime-backed admin echo");
    }

    const promptResult = await client.getPrompt({
      name: "server_usage_guide",
      arguments: {
        goal: "onboard a new agent"
      }
    });
    const firstMessage = promptResult.messages[0];
    expect(firstMessage).toBeDefined();
    if (firstMessage !== undefined && firstMessage.content.type === "text") {
      expect(firstMessage.content.text).toContain("app://index");
      expect(firstMessage.content.text).toContain("onboard a new agent");
    }

    await client.close();
    await server.close();
  });

  it("validates admin_echo after the permission gate when authorized", async () => {
    const server = createMcpServer({
      runtimeDefaults: {
        defaultAccountSid: "AC999",
        defaultPage: 2,
        defaultCount: 5,
        permissionLevel: "write",
        docsAvailable: false
      }
    });
    const client = new Client({
      name: "mcp-starter-test-client",
      version: "0.2.0"
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const validationErrorResult = CallToolResultSchema.parse(
      await client.callTool(
        {
          name: "admin_echo",
          arguments: {}
        },
        CallToolResultSchema
      )
    );
    expect(validationErrorResult.isError).toBe(true);
    const validationText = validationErrorResult.content.find((item: { type: string }) => item.type === "text");
    expect(validationText).toBeDefined();
    if (validationText?.type === "text") {
      expect(validationText.text).toContain("Validation failed");
      expect(validationText.text).toContain("message is required");
    }

    const authorizedResult = CallToolResultSchema.parse(
      await client.callTool(
        {
          name: "admin_echo",
          arguments: {
            message: "deploy"
          }
        },
        CallToolResultSchema
      )
    );
    expect(authorizedResult.isError).not.toBe(true);
    const authorizedText = authorizedResult.content.find((item: { type: string }) => item.type === "text");
    expect(authorizedText).toBeDefined();
    if (authorizedText?.type === "text") {
      const parsed = JSON.parse(authorizedText.text) as {
        echoed: string;
        accountSid: string | null;
        page: number;
        count: number;
      };
      expect(parsed.echoed).toBe("deploy");
      expect(parsed.accountSid).toBe("AC999");
      expect(parsed.page).toBe(2);
      expect(parsed.count).toBe(5);
    }

    const docResult = await client.readResource({
      uri: "app://doc/docs-sdk"
    });
    const docResource = docResult.contents.find((content) => content.uri === "app://doc/docs-sdk");
    expect(docResource).toBeDefined();
    if (docResource !== undefined && "text" in docResource) {
      expect(docResource.text).toContain("Documentation corpus is unavailable");
    }

    await client.close();
    await server.close();
  });
});
