export type ServerProfile = "core" | "operable";
export type PermissionLevel = "none" | "read" | "write" | "admin";
export type Sensitivity = "public" | "internal" | "sensitive";
export type PaginationMode = "none" | "page-count-1-based";
export type DocsAvailability = "none" | "optional" | "required";

export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

export interface RuntimeDefaults {
  readonly defaultAccountSid: string | null;
  readonly defaultServiceProviderSid: string | null;
  readonly defaultRegion: string;
  readonly defaultPage: number;
  readonly defaultCount: number;
  readonly docsDir: string;
  readonly docsAvailable: boolean;
  readonly docsManifestPath: string;
  readonly environment: string;
  readonly permissionLevel: PermissionLevel;
  readonly sourceModeCommand: string;
  readonly packageModeCommand: string;
}

export interface ServerOperationMetadata {
  readonly operationId: string;
  readonly minimumPermissionLevel: PermissionLevel;
  readonly sensitivity: Sensitivity;
  readonly supportsRuntimeDefaults: boolean;
  readonly paginationMode: PaginationMode;
  readonly docsAvailability: DocsAvailability;
}

export interface CatalogExample {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly expectedText?: string;
}

export interface ToolCatalogEntry extends ServerOperationMetadata {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputFields: readonly {
    readonly name: string;
    readonly description: string;
    readonly required: boolean;
  }[];
  readonly examples: readonly CatalogExample[];
  readonly usageNotes: readonly string[];
  readonly requiresRuntimeContext: boolean;
  readonly docs: readonly string[];
}

export interface ResourceCatalogEntry {
  readonly name: string;
  readonly title: string;
  readonly kind: "fixed" | "template";
  readonly uri: string;
  readonly description: string;
  readonly mimeType: string;
  readonly examples: readonly string[];
  readonly usageNotes: readonly string[];
  readonly docs: readonly string[];
}

export interface PromptCatalogEntry {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly args: readonly {
    readonly name: string;
    readonly description: string;
    readonly required: boolean;
  }[];
  readonly usageIntent: string;
  readonly examples: readonly string[];
  readonly docs: readonly string[];
}

export interface DocsCatalogSource {
  readonly slug: string;
  readonly localPath: string;
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly sha256: string;
}

export interface CatalogGenerationInput {
  readonly generatedAt: string;
  readonly docs: readonly DocsCatalogSource[];
  readonly tools: readonly ToolCatalogEntry[];
  readonly resources: readonly ResourceCatalogEntry[];
  readonly prompts: readonly PromptCatalogEntry[];
  readonly runtimeDefaultsTemplate: RuntimeDefaults;
}

export interface GeneratedCatalogModule {
  readonly path: string;
  readonly contents: string;
}

export interface CatalogGenerationOutput {
  readonly generatedAt: string;
  readonly docs: readonly DocsCatalogSource[];
  readonly tools: readonly ToolCatalogEntry[];
  readonly resources: readonly ResourceCatalogEntry[];
  readonly prompts: readonly PromptCatalogEntry[];
  readonly runtimeDefaultsTemplate: RuntimeDefaults;
  readonly modules: readonly GeneratedCatalogModule[];
}
