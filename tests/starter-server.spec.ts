import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer, type McpServerFactory } from "@modelcontextprotocol/server";
import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { describe, expect, it } from "vitest";
import { startServer } from "../src/index.js";
import { SERVER_INFO, createCoreMcpServer, createMcpServer } from "../src/server.js";

const PROTOCOL_ERAS = ["2026-07-28", "2025-11-25"] as const;
type ProtocolEra = (typeof PROTOCOL_ERAS)[number];

interface ConnectedClient {
  readonly client: Client;
  close(): Promise<void>;
}

/**
 * Connects an in-memory client in the requested era: `serveStdio` answers `server/discover` for 2026-07-28,
 * and a directly connected server answers the `initialize` handshake for 2025-11-25.
 */
async function connectClient(era: ProtocolEra, createServer: () => McpServer): Promise<ConnectedClient> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const clientInfo = { name: "mcp-starter-test-client", version: SERVER_INFO.version };

  if (era === "2026-07-28") {
    const handle = serveStdio(createServer, { transport: serverTransport });
    const client = new Client(clientInfo, { versionNegotiation: { mode: { pin: era } } });
    await client.connect(clientTransport);
    return {
      client,
      close: async () => {
        await client.close();
        await handle.close();
      }
    };
  }

  const server = createServer();
  await server.connect(serverTransport);
  const client = new Client(clientInfo);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

describe("mcp starter server", () => {
  it("creates a MCP server instance with stable metadata constants", () => {
    const server = createCoreMcpServer();

    expect(server).toBeInstanceOf(McpServer);
    expect(SERVER_INFO).toEqual({
      name: "mcp-starter",
      version: "0.3.0"
    });
  });

  it("starts server with injected serve boundary", () => {
    const receivedFactories: McpServerFactory[] = [];
    const fakeHandle: StdioServerHandle = { close: async () => {} };
    const createServer: McpServerFactory = () => createCoreMcpServer();

    const handle = startServer({
      createServer,
      serve: (factory) => {
        receivedFactories.push(factory);
        return fakeHandle;
      }
    });

    expect(receivedFactories).toEqual([createServer]);
    expect(handle).toBe(fakeHandle);
  });

  describe.each(PROTOCOL_ERAS)("over protocol era %s", (era) => {
    it("exposes operable discovery resources, templates, and prompts", async () => {
      const { client, close } = await connectClient(era, () =>
        createMcpServer({
          runtimeDefaults: {
            defaultAccountSid: "AC123",
            defaultServiceProviderSid: "SP123",
            defaultRegion: "mx-central",
            defaultPage: 1,
            defaultCount: 25,
            permissionLevel: "read",
            docsAvailable: true
          }
        })
      );
      expect(client.getProtocolEra()).toBe(era === "2026-07-28" ? "modern" : "legacy");

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

      const echoResult = await client.callTool({
        name: "echo",
        arguments: {
          message: "hello",
          uppercase: true
        }
      });
      const echoText = echoResult.content.find((item: { type: string }) => item.type === "text");
      expect(echoText).toBeDefined();
      if (echoText?.type === "text") {
        expect(echoText.text).toBe("HELLO");
      }
      expect(echoResult.structuredContent).toEqual({ echoed: "HELLO" });
      const echoTool = tools.tools.find((tool) => tool.name === "echo");
      expect(echoTool?.outputSchema).toBeDefined();
      expect(echoTool?.annotations?.readOnlyHint).toBe(true);

      const deniedResult = await client.callTool({
        name: "admin_echo",
        arguments: {}
      });
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

      await close();
    });

    it("validates admin_echo after the permission gate when authorized", async () => {
      const { client, close } = await connectClient(era, () =>
        createMcpServer({
          runtimeDefaults: {
            defaultAccountSid: "AC999",
            defaultPage: 2,
            defaultCount: 5,
            permissionLevel: "write",
            docsAvailable: false
          }
        })
      );
      expect(client.getProtocolEra()).toBe(era === "2026-07-28" ? "modern" : "legacy");

      const validationErrorResult = await client.callTool({
        name: "admin_echo",
        arguments: {}
      });
      expect(validationErrorResult.isError).toBe(true);
      const validationText = validationErrorResult.content.find((item: { type: string }) => item.type === "text");
      expect(validationText).toBeDefined();
      if (validationText?.type === "text") {
        expect(validationText.text).toContain("Validation failed");
        expect(validationText.text).toContain("message is required");
      }

      const authorizedResult = await client.callTool({
        name: "admin_echo",
        arguments: {
          message: "deploy"
        }
      });
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
        uri: "app://doc/docs-2026-07-28-sdk"
      });
      const docResource = docResult.contents.find((content) => content.uri === "app://doc/docs-2026-07-28-sdk");
      expect(docResource).toBeDefined();
      if (docResource !== undefined && "text" in docResource) {
        expect(docResource.text).toContain("Documentation corpus is unavailable");
      }

      await expect(client.readResource({ uri: "app://doc/unknown-slug" })).rejects.toMatchObject({ code: -32602 });

      await close();
    });
  });
});
