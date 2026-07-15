# Design & Tooling

- Always load the frontend-design and ui-ux-pro-max skills before generating or editing any UI component.
- Use the magic-21st and typeui MCP tools for component generation and typed scaffolding.
- Use the supabase MCP tool for schema inspection and queries — never run destructive operations (DROP, TRUNCATE, DELETE without WHERE) without explicit confirmation from the user first.
- This MCP server must only ever point at the dev/staging Supabase project, never production.
