# Repository Guidelines

## IMPORTANT
- ALWAYS reference `@.kiro/specs/community-board/tasks.md` file.
- ALWAYS check `@.kiro/specs/community-board/tasks.md` todo list after each task is done.
- ALWAYS ask user for permission when implementing a plan.
- ALWAYS follow TDD (Test-Driven Development) approach - write tests first, then implement.
- NEVER use emoji.

## Project Structure & Module Organization
Keep all API logic in `src/` once the scaffold lands. Use `src/app.js` for Express configuration, `src/routes/` for HTTP route modules (group by resource: `posts.routes.js`, `users.routes.js`). Data-layer code lives in `src/db/`, with Knex query builders in `src/db/queries/` and transaction helpers in `src/db/transactions/`. Database migrations belong to `db/migrations/` and seeds to `db/seeds/`. Mirror the runtime structure under `tests/` (for example `tests/posts/posts.spec.js`) so every module has a matching test file. Keep product notes in `plan.md`.

## Build, Test, and Development Commands
Run `npm install` to sync dependencies. Use `npm run dev` for a hot-reloading API server, `npm run start` for the production server, and `npm run migrate:latest` / `npm run migrate:rollback` to manage schema evolution. Populate baseline data with `npm run seed`. Execute `npm test` before pushing; add `npm run lint` to catch style issues locally.

## Coding Style & Naming Conventions
Use 2-space indentation, semicolons, and single quotes. Keep files in `kebab-case.js`; Knex migrations follow `YYYYMMDDHHmm_resource_change.js`. Variables and functions are `camelCase`, classes are `PascalCase`, constants `SCREAMING_SNAKE_CASE`. Run `eslint . --fix` and `prettier --check .` before committing. Avoid business logic in route files; push it into `src/services/`.

## Testing Guidelines
We rely on Jest; create unit tests alongside modules using the `.spec.js` suffix. Use `describe` blocks per resource and seed the database with helper factories. Integration tests should run against a disposable MySQL schema configured via `.env.test`; never run destructive tests against shared databases. Aim to keep coverage above 80%, paying closest attention to complex SQL branches.

## Commit & Pull Request Guidelines
There is no commit history yet, so adopt Conventional Commits (`feat: add posts controller`, `fix: correct tag join`). Keep commits small and self-contained. Pull requests must link the relevant ticket, summarize schema or API changes, list new migrations, and include screenshots or sample curl commands for new endpoints. Ensure CI passes (`npm test`, `npm run lint`, migrations) before requesting review.
