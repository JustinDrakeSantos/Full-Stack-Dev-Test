# FieldQuote AI — Technical reference

FieldQuote AI is a mobile-first HVAC estimating application that helps technicians document inspections, select equipment and labor, and prepare itemized estimates. It supports AI-assisted recommendations with technician approval, while keeping pricing calculations based on the supplied catalog data.

Assessment write-up: [docs/SOLUTION.md](docs/SOLUTION.md). Original assignment: [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md).

## Requirements and local setup

Requires **Node.js 22+** and npm. From this directory:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Vite serves the frontend and proxies `/api` to the Node server on port 3001.

To serve the built application:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Stop an existing backend before starting another on the same port. The backend binds to `127.0.0.1`.

## Stack and architecture

- React 19, strict TypeScript, Vite and plain CSS.
- Node.js HTTP server executed with `tsx`; no Express or application framework.
- Zod runtime validation shared between client and server.
- JSON source data and browser localStorage; no database or authentication.

| Module | Responsibility |
|---|---|
| `src/domain.ts` | Data normalization, catalog IDs/display names, quantity validation, integer-cent calculations and inspection/recommendation schemas |
| `src/App.tsx` | Workflow state, selection, recommendation approval, editable items and draft persistence |
| `src/recommendations.ts` | Client request, response validation and safe error handling |
| `src/workflow.ts` | Symptom selection and deterministic proposed-scope generation |
| `src/draft.ts` / `src/localCustomers.ts` | Persisted-draft and local-customer validation |
| `src/AddCustomer.tsx` | New customer/property form |
| `src/EstimateDrawer.tsx` | Native modal estimate drawer and focus management |
| `src/CustomerEstimate.tsx` | Itemized review, presentation fields, scope and browser printing |
| `src/styles.css` | Responsive layout, focus styling and print rules |
| `server/index.ts` | API routes, input limits, errors and built-file serving |
| `server/ai.ts` | Provider adapter and deterministic demo |

Data flow: source JSON → normalized catalog → inspection → validated recommendations → technician approval → selected item IDs/quantities → deterministic subtotal → customer review. Manual selection enters the same calculation path. Normal estimate calculations run in the browser; there is no authoritative saved-quote backend endpoint.

## Server configuration

`.env.example` contains the configuration template. Copy it to ignored `.env` for local secrets. Normal npm scripts **do not automatically load `.env`**.

| Variable | Default | Meaning |
|---|---|---|
| `AI_MODE` | Demo when not `live` | Set `live` to enable provider requests on the normal endpoint |
| `AI_API_KEY` | None | Server-side provider credential required for live mode |
| `AI_BASE_URL` | `https://api.openai.com/v1` | HTTPS OpenAI-compatible API base URL |
| `AI_MODEL` | `gpt-4.1-mini` | Provider model identifier |
| `PORT` | `3001` | Backend listening port; Vite proxy also requires adjustment if changed |

To explicitly load `.env`:

```sh
# Terminal 1: backend
node --env-file=.env --import tsx server/index.ts
# Terminal 2: development frontend
npx vite --host 127.0.0.1
```

For the built website, only the backend command is needed after `npm run build`. Live generation incurs provider charges. Keep credentials out of `VITE_*`, browser code and Git.

## API and recommendation contract

| Route | Behavior |
|---|---|
| `POST /api/recommend` | Uses configured demo/live mode |
| `POST /api/recommend/demo` | Forces deterministic demo; no provider call |

Both accept the strict inspection schema from `src/domain.ts`. Incoming bodies are limited to 12KB. Provider requests time out after 15 seconds and client requests after 20 seconds. Errors are sanitized; manual selection remains available after failures.

Live requests send inspection facts and catalog IDs/names/types/descriptions, excluding customer identity/contact records and prices. Free-text fields still contain whatever the technician enters.

Responses contain `mode`, `recommendations`, `missingInformation` and `assumptions`. Recommendations are limited to 12 existing catalog IDs, valid quantities, bounded reasons and `requiresVerification: true`. Duplicate IDs, unknown IDs and unexpected fields reject the response. JSON mode is followed by application-side schema validation. Suggestions affect estimates only after explicit selection.

Demo mode chooses the first labor record matching the requested job at estimated minimum hours. It does not diagnose faults, verify service level or select equipment. The explicit demo endpoint works independently of normal live configuration but requires a running backend.

## Source data and pricing

The unchanged `data/` files contain **30 equipment items, 11 hourly labor records and 10 customer/property records**.

- Equipment `baseCost`/`base_cost` and customer `propertyType`/`property_type`, `squareFootage`/`sqft` are normalized.
- Missing property details remain unknown. Invalid/duplicate records produce notices.
- Labor IDs are synthesized as `jobType:level`; readable display names are separate from IDs.
- Equipment accepts 1–100 whole units; labor accepts 0.01–100 hours in hundredths.
- Rates convert to integer cents; quantities to integer hundredths. Each line rounds half-up to cents before summing.
- Equipment uses source base costs and labor uses listed hourly charges. Estimated hour ranges are guidance, not billing minimums.

**Estimated subtotal** combines those amounts. **Final customer price: not set** indicates that tax, markup, adjustments and selling-price policy require verification. No additional charges are inferred.

## Persistence and presentation

One draft, presentation settings and up to 100 added customer/property records are stored unencrypted in localStorage. Data is not synchronized or backed up. Clearing a draft retains added customers; remove them separately under Property on shared devices. Invalid/incompatible saved data is discarded.

The mobile **View** action opens the estimate drawer; **Added ✓** opens its selected item. Desktop/tablet use the side editor. Scope generation is deterministic from selected items, editable and preserved after item changes; explicit regeneration confirms before replacing text. Output uses browser print/save rather than a PDF-generation service.

## Validation

```sh
npm run typecheck
npm test
npm run build
# With a built server running; uses only the no-charge demo route:
node tests/http-smoke.mjs
```

`SMOKE_BASE_URL` optionally changes the smoke-test server URL. The last recorded full suite passed **24 tests**, covering normalization, pricing/rounding, quantities, drafts/customers, scope, catalog matching and simulated AI failures. `tests/live-smoke.ts` is a separate, explicitly authorized paid test and is excluded from `npm test`.

One previously authorized real provider request passed schema/catalog validation. This does not establish broad model accuracy or a full live browser journey. Automated viewport, drawer/keyboard, screen-reader, soft-keyboard and print-pagination checks remain unverified. See [test results](docs/dev-log/TEST_RESULTS.md), the [demo/QA procedure](docs/DEMO.md) and the [current handoff](docs/dev-log/FINAL_HANDOFF.md).

## Current limitations

No authentication, centralized database, multiple saved estimates, CRM/office sync, inventory/compatibility certification, autonomous diagnosis/sizing, formal approval workflow or dedicated PDF generation. Native dialog requires a modern browser. There is no durable AI approval-history record, draft migration, multi-tab conflict handling, provider rate/cost control or public-deployment hardening.

Development history, decisions and unresolved issues are recorded in [docs/dev-log/](docs/dev-log/SESSION_LOG.md).
