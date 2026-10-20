// Explicitly authorized, single-request live smoke test. Never runs under npm test.
import assert from "node:assert/strict";
import { recommend } from "../server/ai.js";
import { catalog, lineTotal } from "../src/domain.js";
const model = process.env.AI_MODEL ?? "gpt-4.1-mini";
const base = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
if (
  model !== "gpt-4.1-mini" ||
  base.replace(/\/$/, "") !== "https://api.openai.com/v1"
) {
  console.log(
    "NOT RUN: configuration differs from the OpenAI gpt-4.1-mini request approved for this test.",
  );
  process.exit(1);
}
if (!process.env.AI_API_KEY) {
  console.log("NOT RUN: AI_API_KEY is missing.");
  process.exit(1);
}
let calls = 0;
let usage:
  | {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    }
  | undefined;
let status: number | undefined;
let providerCode: string | undefined;
const started = performance.now();
const observedFetch: typeof fetch = async (input, init) => {
  assert.equal(++calls, 1, "Only one provider request is authorized");
  const response = await fetch(input, init);
  status = response.status;
  const metadata = (await response.clone().json()) as {
    usage?: typeof usage;
    error?: { code?: unknown };
  };
  usage = metadata.usage;
  const code = metadata.error?.code;
  if (typeof code === "string" && /^[a-z_]{1,60}$/.test(code))
    providerCode = code;
  return response;
};
try {
  const result = await recommend(
    {
      system: "Central AC + Gas Furnace",
      issue:
        "Technician requests diagnostic labor only for reported intermittent cooling. Cause is not confirmed.",
      condition: "Unknown",
      age: "",
      specs: "No measurements confirmed; do not infer equipment compatibility.",
      job: "diagnostic",
      urgency: "Routine",
      notes: "Synthetic smoke test. No customer or property identity provided.",
    },
    { mode: "live", key: process.env.AI_API_KEY, model, base },
    observedFetch,
  );
  assert.equal(result.mode, "live");
  const items = result.recommendations.map((r) => {
    const item = catalog.find((i) => i.id === r.catalogId)!;
    assert.equal(r.requiresVerification, true);
    return {
      id: r.catalogId,
      quantity: r.quantity,
      lineCents: lineTotal(item, r.quantity),
    };
  });
  console.log(
    JSON.stringify(
      {
        outcome: "PASS",
        calls,
        status,
        model,
        elapsedMs: Math.round(performance.now() - started),
        items,
        verificationQuestions: result.missingInformation.length,
        assumptions: result.assumptions.length,
        usage,
        estimatedUSD: usage
          ? ((usage.prompt_tokens ?? 0) * 0.4 +
              (usage.completion_tokens ?? 0) * 1.6) /
            1000000
          : undefined,
      },
      null,
      2,
    ),
  );
} catch {
  console.log(
    JSON.stringify(
      {
        outcome: "FAIL",
        calls,
        status,
        providerCode,
        elapsedMs: Math.round(performance.now() - started),
        usage,
        note: "No automatic retry. Provider response text and credentials withheld.",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
