# Edit MCP Server

## Purpose

Modify an existing MCP server without accidentally breaking public contracts, discoverability, or operational behavior. Every edit must begin with a compatibility inventory and end with deterministic proof that unchanged contracts still behave correctly.

## First Principle

An MCP refactor is not “internal” if it alters any of the following:

1. Tool names
2. Resource URIs
3. Resource template URI patterns
4. Prompt IDs
5. Server metadata
6. Startup command semantics
7. Runtime defaults behavior
8. Package `bin` behavior

Treat each of these as a public API.

## Mandatory Pre-Edit Inventory

Before changing code, capture the current state of:

1. Composition boundaries
   - factory modules
   - transport entrypoints
   - helper modules
   - generator scripts
2. Public contracts
   - tools
   - resources
   - templates
   - prompts
   - metadata/version
3. Runtime behavior
   - defaults currently exposed
   - defaults currently hidden in env only
4. Permission behavior
   - restricted operations
   - current order of permission and validation
5. Packaging behavior
   - source-mode run command
   - `bin` run command
   - package metadata

If this inventory is not explicit, the edit is not safe.

## Classification of Change

Classify the requested edit before implementation:

1. **Behavior-preserving refactor**
   - code moves, no contract changes
2. **Non-breaking enhancement**
   - new tool/resource/template/prompt
   - richer catalog content
   - new runtime defaults field
3. **Behavioral correction**
   - bug fix, permission ordering fix, runtime bug
4. **Potentially breaking change**
   - renamed identifiers
   - changed response shapes
   - changed startup command
   - removed capabilities

For category 4, explicitly call out the break and require intent alignment in the final delivery note.

## Safe Edit Sequence

### Step 1: Freeze Public Contracts

Record what must not change unless explicitly requested:

1. Tool identifiers
2. Resource URIs
3. Template URI patterns
4. Prompt identifiers
5. Metadata version/name
6. Any generated operation IDs or slugs

Then write tests around the frozen contracts if they do not already exist.

### Step 2: Move Logic to Stable Boundaries

If the server is difficult to edit safely:

1. Move capability registration into the factory.
2. Move process side effects into the entrypoint.
3. Move environment parsing into a runtime resolver.
4. Move repeated capability metadata into shared definitions or generated artifacts.

This refactor should happen before introducing new behavior.

### Step 3: Apply the Smallest Coherent Mutation

Rules:

1. Change only the modules that own the behavior.
2. Do not mix refactor noise with new public capabilities unless unavoidable.
3. If a change touches generated files, update the generator or the shared seed first, then regenerate.
4. Preserve stable ordering in arrays, maps, and generated outputs.

### Step 4: Reconcile Discoverability

After any edit, verify whether the change affects:

1. `resources/list`
2. `resources/templates/list`
3. `prompts/list`
4. index resource content
5. tool/resource/prompt catalog entries
6. usage guidance content
7. runtime defaults visibility

If behavior changed but discovery docs did not, the edit is incomplete.

### Step 5: Re-run Compatibility and Smoke Gates

At minimum:

1. unchanged contract tests
2. new behavior tests
3. transport startup smoke tests
4. package dry-run when distribution is affected

## Required Compatibility Rules

1. Do not rename tool names unless a breaking change is intended.
2. Do not rename resource URIs unless a breaking change is intended.
3. Do not alter template URI patterns casually; agents may be depending on them.
4. Do not repurpose a prompt ID for a different semantic meaning.
5. Do not change the server `name` lightly; some clients treat it as an identity.
6. Do not silently change source-mode or package-mode run commands.
7. Do not remove docs fallbacks if docs are optional at runtime.

## Handling Permission Refactors

Permission fixes are high-risk because they often affect error semantics.

If touching restricted operations:

1. Verify the current order of validation vs permission.
2. If the current order returns misleading schema errors, move permission checks earlier.
3. Keep schemas permissive enough that the handler can produce the correct semantic authorization failure when required.
4. Add tests proving:
   - the restricted tool remains discoverable
   - permission denial occurs before business validation
   - valid authorized calls still succeed

## Handling Runtime Default Changes

If touching runtime defaults:

1. Centralize default resolution in one module.
2. Do not read environment variables opportunistically across multiple handlers.
3. Update the runtime defaults resource.
4. Update any usage prompt or catalog entry that references inherited values.
5. Add tests for both present and absent defaults.

## Handling Generated Catalog Changes

If the server uses generated catalogs:

1. Modify the generator input source, not the generated file, unless there is an emergency patch and the user explicitly accepts it.
2. Regenerate artifacts immediately after changing inputs.
3. Verify generated ordering remains stable.
4. Run tests that prove the generated output still matches the live registered capabilities.
5. Call out any generator contract changes in the delivery notes.

## Rollback Strategy

Every non-trivial edit should preserve a rollback path:

1. Keep changes localized to the owning boundary.
2. Avoid deleting old identifiers unless explicitly requested.
3. Prefer additive changes over destructive replacements.
4. If the change is breaking, document the prior contract and the new contract.
5. Keep tests that capture the old behavior when the user needs a migration path.

## Acceptance Criteria

An MCP edit is complete only if:

1. All unchanged public contracts still behave as before.
2. New or corrected behavior is covered by tests.
3. Discoverability content reflects the current state accurately.
4. Runtime defaults, permissions, and packaging behavior remain coherent.
5. Any intentional break is explicitly identified and justified.

## Common Failure Patterns

Avoid these mistakes:

1. Treating a renamed tool as an internal refactor.
2. Updating the handler but not the catalog resource.
3. Updating generated files directly without fixing the source of truth.
4. Fixing permissions but leaving the SDK to throw the wrong error first.
5. Changing the local run command and forgetting the packaged `bin` path.
