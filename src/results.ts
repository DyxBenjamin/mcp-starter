/**
 * @file Builds MCP result payloads: toolErrorResult for tool errors, jsonResource and textResource for resource reads.
 * @tags mcp-results, tool-registration
 */
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/server";

export function toolErrorResult(message: string): CallToolResult {
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

export function jsonResource(uri: string, payload: unknown): ReadResourceResult {
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

export function textResource(uri: string, text: string, mimeType: string): ReadResourceResult {
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
