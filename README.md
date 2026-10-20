# FieldQuote AI

A mobile-first HVAC estimating tool built for the [Field Estimate Tool assignment](docs/ASSIGNMENT.md). It brings the supplied equipment, labor and customer records into one workflow: **select property → inspect → review recommendations or choose items manually → review an itemized estimate**.

## What I built

- Searchable customer/property records, including a form for new customers saved on the current device.
- Searchable equipment and labor, editable units/hours, immediate totals and local draft restoration.
- A short inspection with symptom shortcuts and validated server-side AI recommendations. Suggestions show a reason and require explicit approval; manual estimating remains available.
- A mobile estimate drawer, tablet side editor, and customer-facing review with equipment/labor subtotals, editable branding, generated editable scope, assumptions, exclusions and browser print/save.
- Plain-language notices for inconsistent source fields rather than silently assuming clean data.

**Pricing is deliberately conservative:** equipment uses supplied base costs; labor uses listed hourly charges. The interface calls the combined amount **Estimated subtotal** and shows **Final customer price: not set**. Tax, markup, adjustments and selling-price policy require business verification. No equipment compatibility, sizing, diagnosis or completed work is implied.

## Run locally

Requires **Node.js 22+** and npm. From this directory:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. This runs Vite and a Node API server; `/api` is proxied to port 3001. For the built app:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Stop an existing backend before starting another on the same port. Nothing is publicly deployed by these commands.

## AI: demo and live

Without configuration the backend uses **deterministic Demo Mode**, with no provider call. The explicit **Try demo recommendations · no model call** button always forces demo, even on a live-configured server. It selects a provisional labor entry matching the job category at estimated minimum hours and explains its limitations; it does not simulate a diagnosis or select equipment. See the [end-to-end demo walkthrough](docs/DEMO.md).

For live AI, copy `.env.example` to ignored `.env` and set a personal `AI_API_KEY`, `AI_MODE=live`, and an OpenAI-compatible `AI_MODEL`/HTTPS `AI_BASE_URL`. The example uses `gpt-4.1-mini`. Normal npm scripts **do not automatically load `.env`**. Start the backend and frontend separately:

```sh
# Terminal 1: explicitly load server configuration
node --env-file=.env --import tsx server/index.ts
# Terminal 2: frontend development server
npx vite --host 127.0.0.1
```

For the built website, only the backend command is needed after `npm run build`. Live generation incurs provider charges. Never put keys in `VITE_*`, screenshots, chat or Git. Only bounded inspection facts and catalog IDs/names/model descriptions go to the provider; customer identity/contact records and prices are excluded. Free text still contains what the technician types, so omit personal information.

Requests use JSON mode plus strict application-side validation of catalog IDs, quantities, duplicate entries and allowed fields. Invalid output is rejected as a whole; authoritative prices always come from the catalog. Provider requests time out after 15 seconds, the client after 20 seconds. Failures leave manual selection available. JSON mode and schema validation serve different purposes, as described in the [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Why these choices

React + strict TypeScript, plain CSS, Zod and a small Node HTTP server keep the solution inspectable without a database or framework overhead. Data normalization and deterministic pricing are independent of React and the model. Native modal dialog behavior supports the estimate drawer without another UI dependency.

The supplied data has **30 equipment items, 11 hourly labor records and 10 customer/property records**. Alternate `base_cost`, `property_type` and `sqft` fields are normalized; missing property details remain unknown. Labor has no source IDs, so stable `jobType:level` IDs are synthesized and paired with readable service names. Original JSON is unchanged.

Prices convert to integer cents, labor quantities to integer hundredths, and each line rounds half-up to the nearest cent before summing. Equipment accepts 1–100 whole units; labor accepts 0.01–100 hours. Estimated hour ranges are guidance, not billing minimums. Repeated addition opens the existing item for editing rather than duplicating it.

## Validation and limits

```sh
npm run typecheck
npm test
npm run build
# With a built server running; this calls only the no-charge demo endpoint:
node tests/http-smoke.mjs
```

Latest full suite: **24 passing tests**, covering pricing/rounding, normalization, invalid quantities, local customer/draft validation, scope generation, catalog matching, demo contracts and simulated provider/client failures. Build, typecheck, formatting and HTTP smoke results are recorded in [TEST_RESULTS.md](docs/dev-log/TEST_RESULTS.md). One previously authorized real OpenAI request passed schema/catalog validation; that is not a full live browser journey or broad model-quality evaluation.

The developer has exercised the product and reported it working as envisioned. Automated browser tooling was unavailable: exact viewport, keyboard/drawer focus, screen-reader, soft-keyboard and print-pagination checks remain **NOT VERIFIED** by the agent. Use [the final handoff checklist](docs/dev-log/FINAL_HANDOFF.md) before submission. No measured estimate-time savings are claimed.

Drafts and up to 100 added customer/property records live unencrypted in browser localStorage; no sync, office sharing or backup. Clearing an estimate retains added customer records; remove them separately under Property on shared devices. Corrupted/incompatible storage is discarded. Pending recommendation reasons are not durably audited. Generated scope is a proposal and must be reconciled after item changes.

## What I would change with more time

Prioritize real-device/keyboard/print QA, confirmed customer pricing policy, and technician-reviewed AI evaluation. Then add durable multi-estimate storage, record editing, draft migration/backup, compatibility metadata and smaller workflow components. Public use would also require authentication, rate/cost limits, origin controls and deployment hardening. Authentication, CRM sync, inventory validation, formal approvals, autonomous diagnosis/sizing and a dedicated PDF generator are outside this assessment implementation.

Start code review with `src/domain.ts`, `server/ai.ts`, then `src/App.tsx`. The [final handoff](docs/dev-log/FINAL_HANDOFF.md) provides a file-by-file guide; [SESSION_LOG.md](docs/dev-log/SESSION_LOG.md) preserves the chronological development audit. No commits, pushes, PRs, public deployments or submission have been performed by the agent; the developer owns those decisions.
