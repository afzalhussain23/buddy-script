# Buddy Script

A Next.js social feed app. Users register, sign in, and view a protected feed of posts shown newest first.

## Conventions
- Use **pnpm** for all dependency management (never npm/yarn).
- Use `fd` instead of `find` and `rg` instead of `grep`.

## Tooling
- **agent-browser skill**: use for any browser automation — navigating pages, filling forms, clicking, screenshots, scraping, and exploratory/QA testing of the app. Prefer it over other built-in browser/web tools.
  - **Test credentials** (already seeded — log in with these, do NOT register a new user each run):
    - Email: `test@buddyscript.dev`
    - Password: `password123`
- **Neon MCP**: use when working with the database — inspecting schema/tables, running SQL, managing branches, connection strings, and migrations. Reach for it instead of guessing about DB state.
