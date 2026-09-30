# Publishing Checklist

This starter includes publish-ready package wiring, but the repository remains `private` by default to avoid accidental publication.

## Before publishing

1. Remove or change `"private": true` in `package.json`.
2. Confirm package name ownership on npm.
3. Run `npm run build`.
4. Run `npm run typecheck && npm test`.
5. Run `npm run pack:dry-run` and verify the package surface.
6. Confirm `repository.url`, `homepage`, and `bugs.url` are correct.
7. Verify npm auth and 2FA are enabled for the publishing account.
8. Set `NPM_TOKEN` in CI if using automated publish.

## Operational notes

- Prefer `npx -y <package-name>` for client registration after publish.
- Source-mode commands like `npx tsx src/index.ts` are cwd-dependent and intended for local development only.
- The included workflow uses provenance (`npm publish --provenance`) and runs build + tests before publish.
- If optional native dependencies cause CI resolution issues, re-run installs with optional dependencies enabled or switch the install step to the same package manager used locally.

## Recommended smoke checks

1. `npm run build`
2. `npm run pack:dry-run`
3. `node dist/index.js` and verify with Inspector that both `server/discover` (2026-07-28) and the `initialize` handshake (2025-11-25) succeed
4. `npx -y @modelcontextprotocol/inspector --cli --config inspector.config.json --server mcp-starter-dist --method tools/list` runs the built `dist/index.js` on protocol `2026-07-28` (the Inspector defaults to the `legacy` era, so the config pins `protocolEra`)
