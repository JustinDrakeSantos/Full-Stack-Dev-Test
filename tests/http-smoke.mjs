import assert from "node:assert/strict";
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001";
const home = await fetch(base);
assert.equal(home.status, 200);
assert.match(await home.text(), /FieldQuote AI/);
const facts = {
  system: "Heat pump",
  issue: "Not cooling",
  condition: "Unknown",
  age: "",
  specs: "",
  job: "diagnostic",
  urgency: "Routine",
  notes: "",
};
const post = (body) =>
  fetch(base + "/api/recommend/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
const response = await post(JSON.stringify(facts));
assert.equal(response.status, 200);
const result = await response.json();
assert.equal(result.mode, "demo");
assert.equal(result.recommendations[0].catalogId, "diagnostic:standard");
assert.equal((await post("{")).status, 400);
assert.equal(
  (await post(JSON.stringify({ ...facts, customerName: "should reject" })))
    .status,
  400,
);
assert.equal((await post("x".repeat(12001))).status, 413);
assert.equal((await fetch(base + "/api/missing")).status, 404);
assert.equal((await fetch(base + "/data/equipment.json")).status, 404);
const asset = (await (await fetch(base)).text()).match(/src="([^"]+\.js)"/)[1];
assert.equal((await fetch(base + asset)).status, 200);
console.log(
  "PASS: built app + asset, demo endpoint, malformed input, unexpected fields, body limit, unknown endpoint, raw data path",
);
