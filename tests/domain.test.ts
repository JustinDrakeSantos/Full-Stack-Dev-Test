import { test } from "node:test";
import assert from "node:assert/strict";
import {
  catalog,
  customers,
  normalize,
  total,
  lineTotal,
  validQuantity,
  inspectionSchema,
  suggestionSchema,
} from "../src/domain.js";
import { recommend, demo } from "../server/ai.js";
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
test("normalization preserves supplied records and alternate fields", () => {
  assert.equal(catalog.length, 41);
  assert.equal(customers.length, 10);
  assert.equal(catalog.find((i) => i.id === "EQ012")?.cents, 27500);
  assert.equal(customers[7].squareFootage, 2750);
  assert.equal(customers[6].systemAge, undefined);
});
test("malformed and duplicate records reported without crashing", () => {
  const valid = {
    id: "X",
    name: "Test",
    category: "Part",
    brand: "X",
    modelNumber: "M",
    baseCost: 10,
  };
  const result = normalize(
    [valid, valid, {}, { ...valid, id: "Y", baseCost: -2 }],
    null,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.warnings.length, 4);
});
test("totals use integer cents, hourly semantics and half-up line rounding", () => {
  const labor = catalog.find((i) => i.id === "diagnostic:standard")!;
  assert.equal(lineTotal(labor, 0.5), 4750);
  assert.equal(total([]), 0);
  assert.equal(
    total([
      { id: "EQ018", quantity: 2 },
      { id: labor.id, quantity: 0.5 },
    ]),
    11150,
  );
  assert.equal(lineTotal({ ...labor, cents: 125 }, 0.1), 13);
  assert.equal(total([{ id: "EQ018", quantity: 1 }]), 3200);
  assert.throws(() => total([{ id: "unknown", quantity: 1 }]));
});
test("invalid, fractional equipment, oversized and imprecise quantities rejected", () => {
  for (const q of [0, -1, NaN, Infinity, 101, 0.5])
    assert.equal(validQuantity(catalog[0], q), false);
  assert.equal(validQuantity(catalog[30], 0.25), true);
  assert.equal(validQuantity(catalog[30], 0.001), false);
  assert.throws(() => lineTotal(catalog[0], 0));
});
test("inspection bounded strict schema", () => {
  assert.equal(inspectionSchema.safeParse(facts).success, true);
  assert.equal(
    inspectionSchema.safeParse({ ...facts, issue: "" }).success,
    false,
  );
  assert.equal(
    inspectionSchema.safeParse({ ...facts, customerName: "PII" }).success,
    false,
  );
});
test("recommendation validation rejects IDs, duplicates, rates and malformed output", () => {
  const result = demo(facts);
  assert.equal(result.recommendations.length, 1);
  for (const change of [
    { catalogId: "fake" },
    { quantity: 0 },
    { quantity: 101 },
    { price: 10 },
    { requiresVerification: false },
  ]) {
    assert.equal(
      suggestionSchema.safeParse({
        ...result,
        recommendations: [{ ...result.recommendations[0], ...change }],
      }).success,
      false,
    );
  }
  assert.equal(
    suggestionSchema.safeParse({
      ...result,
      recommendations: [result.recommendations[0], result.recommendations[0]],
    }).success,
    false,
  );
  assert.equal(
    suggestionSchema.safeParse({
      recommendations: [],
      missingInformation: [],
      assumptions: [],
    }).success,
    true,
  );
  assert.equal(suggestionSchema.safeParse({}).success, false);
});
test("default demo, missing key, network failure and timeout errors", async () => {
  assert.equal((await recommend(facts, {})).mode, "demo");
  await assert.rejects(recommend(facts, { mode: "live" }));
  for (const name of ["network", "TimeoutError"])
    await assert.rejects(
      recommend(facts, { mode: "live", key: "test" }, async () => {
        throw new Error(name);
      }),
    );
});
test("live adapter validates provider JSON and HTTP failures without leaking keys", async () => {
  const config = { mode: "live", key: "test" };
  const response =
    (body: unknown, status = 200) =>
    async () =>
      new Response(JSON.stringify(body), { status });
  await assert.rejects(recommend(facts, config, response({}, 500)));
  await assert.rejects(
    recommend(
      facts,
      config,
      response({ choices: [{ message: { content: "bad json" } }] }),
    ),
  );
  const valid = await recommend(
    facts,
    config,
    response({
      choices: [{ message: { content: JSON.stringify(demo(facts)) } }],
    }),
  );
  assert.equal(valid.mode, "live");
});

test("customer normalization handles incomplete, malformed and duplicate records", async () => {
  const { normalizeCustomers } = await import("../src/domain.js");
  const data = normalizeCustomers([
    {
      id: "X",
      name: "Test",
      address: "Site",
      property_type: "commercial",
      sqft: 100,
    },
    { id: "X", name: "Duplicate", address: "Site" },
    null,
  ]);
  assert.equal(data.customers.length, 1);
  assert.equal(data.customers[0].squareFootage, 100);
  assert.equal(data.customers[0].systemType, "Unknown");
  assert.equal(data.warnings.length, 3);
});
test("drafts restore manual estimates and partially completed inspections", async () => {
  const { parseDraft, initialInspection } = await import("../src/draft.js");
  const d = {
    customerId: "CUST001",
    lines: [{ id: "EQ018", quantity: 1 }],
    inspection: initialInspection,
    notes: "Scope",
  };
  assert.deepEqual(parseDraft(d), d);
  assert.ok(parseDraft({ ...d, customerId: "" }));
  assert.equal(
    parseDraft({ ...d, lines: [{ id: "fake", quantity: 1 }] }),
    null,
  );
  assert.equal(
    parseDraft({ ...d, lines: [{ id: "EQ018", quantity: -1 }] }),
    null,
  );
  assert.equal(
    parseDraft({ ...d, inspection: { ...initialInspection, issue: "ab" } })
      ?.inspection.issue,
    "ab",
  );
  assert.equal(parseDraft(null), null);
});
test("currency normalization tolerates binary representation of two-decimal prices", () => {
  const result = normalize(
    [
      {
        id: "X",
        name: "Test",
        category: "Part",
        brand: "X",
        modelNumber: "M",
        baseCost: 0.29,
      },
    ],
    [],
  );
  assert.equal(result.items[0].cents, 29);
});

test("presentation draft fields round-trip while legacy drafts and incomplete edits remain restorable", async () => {
  const { parseDraft, initialInspection, defaultPresentation } =
    await import("../src/draft.js");
  const legacy = {
    customerId: "CUST001",
    lines: [],
    inspection: initialInspection,
    notes: "Scope",
  };
  assert.deepEqual(parseDraft(legacy), legacy);
  const draft = {
    ...legacy,
    presentation: {
      ...defaultPresentation,
      assumptions: "Confirm voltage",
      exclusions: "Duct modifications",
    },
  };
  assert.deepEqual(parseDraft(draft), draft);
  assert.ok(
    parseDraft({
      ...draft,
      presentation: { ...draft.presentation, businessName: "", title: "" },
    }),
  );
  assert.equal(
    parseDraft({
      ...draft,
      presentation: { ...draft.presentation, exclusions: "x".repeat(2001) },
    }),
    null,
  );
});
test("customer receipt groups trusted prices and escapes entered scope text", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: CustomerEstimate } =
    await import("../src/CustomerEstimate.js");
  const { defaultPresentation } = await import("../src/draft.js");
  const html = renderToStaticMarkup(
    createElement(CustomerEstimate, {
      customer: customers[0],
      lines: [
        { id: "EQ018", quantity: 2 },
        { id: "repair:minor", quantity: 1.5 },
      ],
      notes: "<script>scope</script>",
      onNotesChange: () => {},
      presentation: {
        ...defaultPresentation,
        businessName: "Test HVAC",
        assumptions: "Confirm fit",
        exclusions: "Duct work",
      },
      onPresentationChange: () => {},
      hasInvalid: false,
      onEdit: () => {},
    }),
  );
  for (const value of [
    "Test HVAC",
    "Equipment &amp; materials",
    "Labor &amp; services",
    "$64.00",
    "$165.00",
    "$229.00",
    "Confirm fit",
    "Duct work",
    "&lt;script&gt;scope&lt;/script&gt;",
  ])
    assert.ok(html.includes(value), value);
  assert.equal(html.includes("<script>scope</script>"), false);
});

test("local customer validation accepts unknown optional details and rejects invalid properties", async () => {
  const { localCustomerSchema, localCustomerListSchema, sameSite } =
    await import("../src/localCustomers.js");
  const record = {
    id: "LOCAL-12345678-1234-1234-1234-123456789abc",
    name: "New Customer",
    address: "New site",
    propertyType: "Unknown",
    systemType: "Unknown",
  };
  assert.equal(localCustomerSchema.safeParse(record).success, true);
  for (const change of [
    { name: "  " },
    { address: "" },
    { systemAge: -1 },
    { squareFootage: 0 },
    { squareFootage: 1.5 },
    { phone: "x".repeat(41) },
    { id: "CUST001" },
  ])
    assert.equal(
      localCustomerSchema.safeParse({ ...record, ...change }).success,
      false,
    );
  assert.equal(
    localCustomerListSchema.safeParse([record, record]).success,
    false,
  );
  assert.equal(
    localCustomerListSchema.safeParse(Array(101).fill(record)).success,
    false,
  );
  assert.equal(
    sameSite(record, { name: " new  customer ", address: " NEW SITE " }),
    true,
  );
  assert.equal(
    sameSite(record, { name: "New Customer", address: "Other site" }),
    false,
  );
});
test("locally created customer selection restores without weakening unknown-customer checks", async () => {
  const { parseDraft, initialInspection } = await import("../src/draft.js");
  const local = {
    id: "LOCAL-12345678-1234-1234-1234-123456789abc",
    name: "New Customer",
    address: "New site",
    propertyType: "Unknown",
    systemType: "Unknown",
  };
  const draft = {
    customerId: local.id,
    localCustomers: [local],
    lines: [],
    inspection: initialInspection,
    notes: "",
  };
  assert.deepEqual(parseDraft(draft), draft);
  assert.equal(parseDraft({ ...draft, localCustomers: [] }), null);
  assert.equal(parseDraft({ ...draft, customerId: "fake" }), null);
  assert.ok(parseDraft({ ...draft, customerId: "" }));
  assert.ok(parseDraft({ ...draft, customerId: "CUST001" }));
});
