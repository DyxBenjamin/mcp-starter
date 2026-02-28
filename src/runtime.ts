import { existsSync } from "node:fs";
import path from "node:path";
import type { PermissionLevel, RuntimeDefaults } from "./contracts.js";
import { RUNTIME_DEFAULTS_TEMPLATE_GENERATED } from "./generated/runtime-contracts.generated.js";

const PERMISSION_LEVELS: readonly PermissionLevel[] = ["none", "read", "write", "admin"] as const;

export function resolveRuntimeDefaults(overrides: Partial<RuntimeDefaults> = {}): RuntimeDefaults {
  const docsDir = overrides.docsDir ?? process.env.MCP_DOCS_DIR ?? path.resolve(process.cwd(), "docs/protocol");
  const docsManifestPath = overrides.docsManifestPath ?? path.join(docsDir, "manifest.json");
  const docsAvailable = overrides.docsAvailable ?? existsSync(docsManifestPath);

  return {
    defaultAccountSid:
      overrides.defaultAccountSid ??
      process.env.MCP_DEFAULT_ACCOUNT_SID ??
      RUNTIME_DEFAULTS_TEMPLATE_GENERATED.defaultAccountSid,
    defaultServiceProviderSid:
      overrides.defaultServiceProviderSid ??
      process.env.MCP_DEFAULT_SERVICE_PROVIDER_SID ??
      RUNTIME_DEFAULTS_TEMPLATE_GENERATED.defaultServiceProviderSid,
    defaultRegion:
      overrides.defaultRegion ?? process.env.MCP_DEFAULT_REGION ?? RUNTIME_DEFAULTS_TEMPLATE_GENERATED.defaultRegion,
    defaultPage:
      overrides.defaultPage ?? parseInteger(process.env.MCP_DEFAULT_PAGE, RUNTIME_DEFAULTS_TEMPLATE_GENERATED.defaultPage),
    defaultCount:
      overrides.defaultCount ?? parseInteger(process.env.MCP_DEFAULT_COUNT, RUNTIME_DEFAULTS_TEMPLATE_GENERATED.defaultCount),
    docsDir,
    docsAvailable,
    docsManifestPath,
    environment: overrides.environment ?? process.env.NODE_ENV ?? RUNTIME_DEFAULTS_TEMPLATE_GENERATED.environment,
    permissionLevel:
      overrides.permissionLevel ??
      normalizePermissionLevel(process.env.MCP_PERMISSION_LEVEL) ??
      RUNTIME_DEFAULTS_TEMPLATE_GENERATED.permissionLevel,
    sourceModeCommand: overrides.sourceModeCommand ?? RUNTIME_DEFAULTS_TEMPLATE_GENERATED.sourceModeCommand,
    packageModeCommand: overrides.packageModeCommand ?? RUNTIME_DEFAULTS_TEMPLATE_GENERATED.packageModeCommand
  };
}

export function hasPermission(current: PermissionLevel, required: PermissionLevel): boolean {
  return PERMISSION_LEVELS.indexOf(current) >= PERMISSION_LEVELS.indexOf(required);
}

export function normalizePermissionLevel(value: string | undefined): PermissionLevel | null {
  if (value === undefined) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (PERMISSION_LEVELS.includes(normalized as PermissionLevel)) {
    return normalized as PermissionLevel;
  }

  return null;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}
