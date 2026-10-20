import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, total, suggestionSchema } from "../src/domain.js";
import { generateScope, toggleSymptom } from "../src/workflow.js";
import { requestRecommendations } from "../src/recommendations.js";
import { demo, recommend } from "../server/ai.js";
const facts = {
  system: "Heat pump",
  issue: "Not cooling",
  condition: "Unknown" as const,
  age: "",
  specs: "",
  job: "diagnostic" as const,
  urgency: "Routine" as const,
  notes: "",
};
test("scope describes selected quantities without diagnosis or invented work", () => {
  const lines = [
    { id: "EQ018", quantity: 2 },
    { id: "repair:minor", quantity: 1.5 },
  ];
  const scope = generateScope(lines);
  assert.match(scope, /Turbo 200/);
  assert.match(scope, /1.5 labor hours/);
  assert.match(scope, /No completed work/);
  assert.equal(total(lines), 22900);
  assert.equal(generateScope([]), "");
  assert.throws(() => generateScope([{ id: "fake", quantity: 1 }]));
  assert.throws(() => generateScope([{ id: "EQ018", quantity: 0 }]));
  assert.ok(
    generateScope(catalog.map((i) => ({ id: i.id, quantity: 1 }))).length <=
      6000,
  );
});
test("symptoms toggle independently while preserving free text", () => {
  const issue = toggleSymptom("Customer reports concern", "Not cooling");
  assert.equal(issue, "Customer reports concern; Not cooling");
  assert.equal(toggleSymptom(issue, "Not cooling"), "Customer reports concern");
  assert.equal(toggleSymptom("", "Poor airflow"), "Poor airflow");
});
test("demo contract passes from inspection through pending validation to manual approval pricing", async () => {
  let path = "";
  const fake: typeof fetch = async (input) => {
    path = String(input);
    return new Response(JSON.stringify({ mode: "demo", ...demo(facts) }));
  };
  const pending = await requestRecommendations(facts, true, fake);
  assert.equal(path, "/api/recommend/demo");
  assert.equal(pending.mode, "demo");
  const approved: { id: string; quantity: number }[] = [];
  assert.equal(total(approved), 0);
  const suggestion = pending.suggestions.recommendations[0];
  approved.push({ id: suggestion.catalogId, quantity: suggestion.quantity });
  assert.equal(total(approved), 4750);
  assert.equal(
    (
      await recommend(facts, { mode: "demo", key: "unused" }, async () => {
        throw Error("Must not call provider");
      })
    ).mode,
    "demo",
  );
});
test("client rejects HTTP errors, missing server, timeout, invalid JSON and unsafe catalog matching", async () => {
  const responses = [
    async () => new Response("{}", { status: 503 }),
    async () => {
      throw Error("Network");
    },
    async () => {
      throw new DOMException("Expired", "TimeoutError");
    },
    async () => new Response("not json"),
    async () => new Response(JSON.stringify({ mode: "live", ...demo(facts) })),
    async () =>
      new Response(
        JSON.stringify({
          mode: "demo",
          ...demo(facts),
          recommendations: [
            { ...demo(facts).recommendations[0], catalogId: "UNKNOWN" },
          ],
        }),
      ),
  ];
  for (const response of responses)
    await assert.rejects(
      requestRecommendations(facts, true, response),
      /manual catalog/,
    );
});
test("catalog quantities/rates remain trusted when provider attempts override", () => {
  const result = demo(facts);
  for (const override of [
    { quantity: 0.001 },
    { quantity: Infinity },
    { hourlyRate: 1 },
    { cents: 0 },
    { catalogType: "equipment" },
  ])
    assert.equal(
      suggestionSchema.safeParse({
        ...result,
        recommendations: [{ ...result.recommendations[0], ...override }],
      }).success,
      false,
    );
});

test("full issue text is preserved instead of silently truncated by shortcuts", () => {
  const full = "x".repeat(1000);
  assert.equal(toggleSymptom(full, "Not cooling"), full);
});
test("empty suggestions remain a valid abstention and invalid inputs never call service", async () => {
  const abstained = await requestRecommendations(
    facts,
    true,
    async () =>
      new Response(
        JSON.stringify({
          mode: "demo",
          recommendations: [],
          missingInformation: ["Confirm diagnosis"],
          assumptions: [],
        }),
      ),
  );
  assert.equal(abstained.suggestions.recommendations.length, 0);
  let calls = 0;
  await assert.rejects(
    requestRecommendations({ ...facts, issue: "" }, true, async () => {
      calls++;
      throw Error();
    }),
  );
  assert.equal(calls, 0);
});

test("readable service labels keep catalog IDs and authoritative hourly pricing", () => {
  const item = catalog.find((i) => i.id === "diagnostic:standard")!;
  assert.equal(item.name, "Standard diagnostic service");
  assert.equal(item.cents, 9500);
  assert.equal(total([{ id: item.id, quantity: 2 }]), 19000);
  assert.equal(catalog.filter((i) => i.kind === "labor").length, 11);
});
test("demo rationale explains the reported work while disclosing sample selection separately", () => {
  for (const job of [
    "diagnostic",
    "repair",
    "install",
    "maintenance",
    "ductwork",
  ] as const) {
    const result = demo({ ...facts, job, system: "x".repeat(120) });
    assert.ok(result.recommendations[0].reason.length <= 400);
    assert.match(result.recommendations[0].reason, /Reported system/);
    assert.doesNotMatch(result.recommendations[0].reason, /Demo rule/);
    assert.ok(result.assumptions.some((a) => a.includes("no AI model")));
    assert.ok(result.assumptions.some((a) => a.includes("first labor entry")));
  }
});
