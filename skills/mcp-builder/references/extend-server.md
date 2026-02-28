# Extend MCP Server

## Purpose

Add new MCP capabilities in a way that preserves architectural discipline, exposes enough context for agents to use the capability correctly, and maintains deterministic error semantics. Extension work is complete only when the new capability is both operational and discoverable.

## Capability Types

This skill supports four extension classes:

1. Tools
2. Fixed resources
3. Resource templates
4. Prompts

Each class has different contract obligations. Do not implement them as if they were interchangeable.

## Mandatory Pre-Extension Design Record

Before writing code, define the new capability in concrete terms:

1. Identifier
   - tool name
   - resource URI
   - template URI pattern
   - prompt ID
2. Functional purpose
   - what the capability does
   - what it does not do
3. Input contract
   - required fields
   - optional fields
   - runtime defaults that may apply
4. Output contract
   - success shape
   - failure shape
5. Permission requirement
   - unrestricted
   - restricted, with minimum level
6. Discoverability requirements
   - description
   - usage notes
   - examples
7. Profile placement
   - `core`
   - `operable`
   - both

If these points are not explicit, the extension is under-specified.

## Extension Procedure

### Step 1: Update Shared Metadata First

Before handler registration:

1. Add or update operation metadata.
2. Add or update catalog seed definitions.
3. Mark whether the capability supports runtime defaults.
4. Mark whether docs availability affects the capability.
5. Define pagination semantics if relevant.

This ensures the discoverability layer remains aligned with the implementation.

### Step 2: Implement the Capability Logic

#### For tools

1. Keep the handler deterministic.
2. Narrow `unknown` inputs explicitly.
3. Isolate external I/O behind adapters.
4. Return structured outputs.
5. Avoid leaking transport-specific behavior into business logic.

#### For fixed resources

1. Use stable URIs.
2. Make reads deterministic.
3. Return clear “not available” states when data depends on runtime conditions.
4. Keep resource contents fit for agent consumption, not only human reading.

#### For resource templates

1. Use stable URI patterns.
2. Define how path variables are interpreted.
3. Implement graceful behavior for missing or invalid values.
4. Keep the lookup semantics deterministic.
5. If completion support exists, keep it stable and test it.

#### For prompts

1. Keep the prompt intent narrow.
2. Define variables explicitly.
3. Prevent ambiguous prompt names.
4. Ensure prompt output teaches or orchestrates a real task.

### Step 3: Register in the Correct Profile

Decide intentionally:

1. `core` only
   - very small example or baseline feature
2. `operable` only
   - discoverability, catalogs, usage guidance, runtime defaults, or advanced lookups
3. both
   - universally useful primitives with low complexity

Do not add heavy agent-facing discovery artifacts to `core` unless the user explicitly wants a single-profile server.

### Step 4: Update Discoverability Immediately

Every new capability must be reflected in the self-documenting layer:

1. `index` resource if the capability changes navigation
2. tool/resource/prompt catalogs as applicable
3. usage guide if invocation behavior changes
4. runtime defaults resource if inheritance is added
5. docs indexes if the capability depends on docs-driven lookup

If the capability is implemented but invisible to discovery, the work is incomplete.

### Step 5: Add Tests Before Closure

At minimum, add:

1. success-path test
2. invalid-input test
3. semantic failure-path test
4. permission denial test if restricted
5. discoverability test proving the capability is listed and documented
6. resource read / prompt retrieval test if applicable

## Tool-Specific Standards

For each tool added:

1. The description must explain intent, not just restate the name.
2. Each meaningful input field must have a usable description.
3. The catalogs should expose at least one example invocation.
4. If runtime defaults can fill missing values, state exactly which values can be inherited.
5. If the tool is restricted, keep it visible but return a semantic authorization failure when access is missing.

A listed tool without enough context to invoke safely is not a completed extension.

## Resource Template Standards

Templates are critical for agent discovery. Each template should define:

1. canonical URI pattern
2. source of truth for lookup
3. valid variable format
4. missing-value behavior
5. corpus-unavailable behavior
6. optional completion behavior if supported

Recommended baseline templates for reusable starters:

1. documentation lookup
2. schema lookup
3. example lookup

## Prompt Standards

At least one extension-grade prompt should provide orchestration guidance, not generic prose.

Good prompt patterns include:

1. server usage guide
2. task-oriented workflow prompt
3. migration or troubleshooting prompt

Poor prompt patterns include:

1. vague generic assistant prompts
2. prompts that duplicate the resource catalogs without adding guidance
3. prompts that hide assumptions about runtime defaults

## Runtime Defaults Rules

When a new capability can inherit runtime values:

1. Do not hide the behavior.
2. Mark the inheritance in metadata.
3. Surface the defaults in the runtime defaults resource.
4. Mention the inheritance in usage guidance.
5. Test both explicit-input and inherited-input paths.

## Versioning and Compatibility

Extension work is not always non-breaking. Treat these as compatibility-sensitive:

1. changing an identifier
2. changing a resource URI pattern
3. changing a response shape
4. changing the meaning of a prompt
5. changing generated operation IDs or docs slugs

If any of these change, call out the compatibility impact explicitly.

## Acceptance Criteria

An extension task is complete only if:

1. The capability is implemented and reachable.
2. The capability is discoverable through the correct MCP primitive.
3. The capability has explicit metadata and usage guidance.
4. The capability is covered by deterministic tests.
5. The capability does not silently break adjacent public contracts.

## Common Failure Patterns

Avoid these mistakes:

1. Adding a tool and forgetting the catalogs.
2. Adding a template without defining missing-value semantics.
3. Adding a prompt that does not explain when to use it.
4. Marking runtime defaults internally but not exposing them to agents.
5. Implementing a restricted operation that fails with the wrong error order.
