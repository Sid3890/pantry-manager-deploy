# Pantry & Recipe Management Backend

This project implements the backend described in the supplied master document as an authenticated **Node.js + Express + tRPC** service with a normalized relational data model.

## Backend capabilities

- Authenticated pantry CRUD with ingredient, unit, and expiry-date tracking.
- Purchase recording that writes purchase history and inventory in one transaction.
- Two-stage recipe recommendations: stored SQL matching first, then real published web recipe retrieval when no fully available stored recipe exists.
- Optional structured LLM selection among retrieved candidates. The model never writes inventory and cannot bypass backend validation.
- Gemini support is available through the server-side REST adapter; when `GEMINI_API_KEY` is set, Gemini is used for candidate selection, otherwise the existing Forge-compatible provider is used.
- Proportional scaling based on the most restrictive ingredient; countable quantities are floored and zero quantities invalidate the recipe.
- Recipe caching after validation using `source = WEB_RETRIEVED`, with source URL attribution retained.
- Transactional cooking that rechecks current stock, deducts ingredients, and records cooking history.
- Transactional expiry processing that logs waste and removes expired pantry rows.
- Waste summaries by ingredient and month, plus a dashboard summary.

## API procedures

All feature procedures require the authenticated Manus session and are available under `/api/trpc`.

| Procedure | Purpose |
| --- | --- |
| `pantry.list`, `pantry.snapshot` | Read current inventory and aggregated stock. |
| `pantry.add`, `pantry.update`, `pantry.remove` | Manage pantry rows. |
| `pantry.expire` | Record and remove expired stock. |
| `purchases.record` | Record a purchase and add its quantity to pantry atomically. |
| `ingredients.list`, `categories.list`, `suppliers.list` | Supporting lookup data. |
| `recipes.list`, `recipes.details`, `recipes.create` | Recipe library operations. |
| `recipes.recommend` | Stored SQL matching followed by guarded web/LLM fallback. |
| `recipes.cook` | Availability recheck, deduction, and cooking log transaction. |
| `cooking.history` | Recent cooking events. |
| `reports.waste`, `reports.dashboard` | Waste and pantry reporting. |

## Schema mapping

The document's 11 core entities are represented by `users`, `categories`, `ingredients`, `pantry_items`, `suppliers`, `purchase_log`, `recipes`, `recipe_ingredients`, `cooking_log`, `dietary_tags`, and `waste_log`. `waste_log.user_id` is retained in this implementation so reports remain isolated per authenticated household; it does not change the ingredient-level waste model.

The managed runtime uses MySQL/TiDB, so Oracle-specific PL/SQL is represented by equivalent transactional server/database operations. The business rules map directly to Oracle implementations: `findStoredRecipeCandidates` corresponds to the document's `match_recipe` function, `cookRecipe` corresponds to `cook_recipe`, and `expirePantry` corresponds to the expiry trigger/procedure flow. If deploying against Oracle, replace the Drizzle adapter and date/decimal mappings with `oracledb` bindings and move these three transactional functions into PL/SQL packages without changing the tRPC contracts.

Oracle deployment references are included in `database/oracle/01_schema.sql` and `database/oracle/02_packages.sql`. They provide the 11-table relational model, constraints, indexes, the recipe availability function, the final stock-check-and-deduct procedure, and expiry-to-waste processing.

## External recipe and AI safety

The web pipeline searches DuckDuckGo HTML results, parses Schema.org `Recipe` JSON-LD from published pages, preserves the source URL, and sends only candidate metadata to the server-side LLM helper. Gemini is instructed to select only from those retrieved candidates; it is not given a recipe-generation task. If AI selection fails, a deterministic first-candidate fallback is used. Every candidate is revalidated against the current pantry before it can be cached. Missing ingredients, incompatible units, and unusable scaled quantities are rejected. Common ingredient aliases such as `onion`/`onions` are normalized before validation.

Recipe websites retain ownership of their content. The application stores attribution and should display the original source URL to users while respecting each source's terms of use.

## Validation

Run:

```bash
pnpm check
pnpm test
pnpm build
```

To enable Gemini locally, copy `.env.example` to `.env` and set `GEMINI_API_KEY`. The key remains server-side and is never sent to the browser.

## Public hosting

The nested `pantry-recipe-management` directory is the deployable full-stack application. From that directory:

```bash
npm install
npm run check
npm run build
npm start
```

The same commands work in PowerShell; no Unix-only `NODE_ENV=...` prefix is required. The application serves the built client and API from one origin. Deployment probes can call `GET /healthz`, which returns `{ "ok": true }` when the process is running. Set `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, and `VITE_APP_ID` before exposing it publicly; set `GEMINI_API_KEY` to enable the search-first Gemini selector.

The database migration is generated in `drizzle/` and is applied to the managed database through the project SQL tool.
