import equipment from "../data/equipment.json";
import labor from "../data/labor_rates.json";
import rawCustomers from "../data/customers.json";
import { z } from "zod";
export type Item = {
  id: string;
  name: string;
  kind: "equipment" | "labor";
  category: string;
  cents: number;
  detail: string;
  minHours?: number;
  maxHours?: number;
};
export type Line = { id: string; quantity: number };
const record = z.record(z.unknown());
const laborNames: Record<string, string> = {
  "diagnostic:standard": "Standard diagnostic service",
  "diagnostic:complex": "Complex diagnostic service",
  "repair:minor": "Minor repair service",
  "repair:major": "Major repair service",
  "install:residential": "Residential installation labor",
  "install:commercial": "Commercial installation labor",
  "install:mini-split": "Mini-split installation labor",
  "maintenance:standard": "Standard maintenance service",
  "maintenance:comprehensive": "Comprehensive maintenance service",
  "ductwork:repair": "Ductwork repair labor",
  "ductwork:new-install": "New ductwork installation labor",
};
export function normalize(eq: unknown, lab: unknown) {
  const items: Item[] = [];
  const warnings: string[] = [];
  function add(raw: unknown, kind: Item["kind"], index: number) {
    try {
      const r = record.parse(raw);
      const str = (v: unknown) => z.string().min(1).parse(v);
      const id =
        kind === "equipment" ? str(r.id) : `${str(r.jobType)}:${str(r.level)}`;
      if (items.some((i) => i.id === id)) throw Error("duplicate ID");
      const price = z
        .number()
        .finite()
        .nonnegative()
        .max(1000000)
        .parse(
          kind === "equipment" ? (r.baseCost ?? r.base_cost) : r.hourlyRate,
        );
      if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6)
        throw Error("price precision");
      const range =
        kind === "labor"
          ? z
              .object({
                min: z.number().positive(),
                max: z.number().positive(),
              })
              .parse(r.estimatedHours)
          : undefined;
      if (range && range.max < range.min) throw Error("invalid hour range");
      items.push({
        id,
        kind,
        name:
          kind === "equipment"
            ? str(r.name)
            : (laborNames[id] ?? `${str(r.jobType)} · ${str(r.level)}`),
        category: kind === "equipment" ? str(r.category) : str(r.jobType),
        cents: Math.round(price * 100),
        detail:
          kind === "equipment"
            ? `${str(r.brand)} · ${str(r.modelNumber)}`
            : `${range!.min}–${range!.max} estimated hours`,
        minHours: range?.min,
        maxHours: range?.max,
      });
      if (r.base_cost !== undefined)
        warnings.push(
          `${id}: Equipment price was read from an alternate field name. No action needed.`,
        );
    } catch {
      warnings.push(
        `${kind} record ${index + 1} could not be loaded because details are invalid or duplicated. Ask the office to review the source record.`,
      );
    }
  }
  if (Array.isArray(eq)) eq.forEach((r, i) => add(r, "equipment", i));
  else warnings.push("Equipment data is not an array");
  if (Array.isArray(lab)) lab.forEach((r, i) => add(r, "labor", i));
  else warnings.push("Labor data is not an array");
  return { items, warnings };
}
export const { items: catalog, warnings } = normalize(equipment, labor);
const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  propertyType: z.string().default("Unknown"),
  squareFootage: z.number().positive().optional(),
  systemType: z.string().default("Unknown"),
  systemAge: z.number().nonnegative().optional(),
  phone: z.string().optional(),
  lastServiceDate: z.string().optional(),
});
export function normalizeCustomers(input: unknown) {
  const customers: z.infer<typeof customerSchema>[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(input))
    return { customers, warnings: ["Customer data is not an array"] };
  input.forEach((raw, index) => {
    try {
      const r = record.parse(raw);
      const c = customerSchema.parse({
        ...r,
        propertyType: r.propertyType ?? r.property_type,
        squareFootage: r.squareFootage ?? r.sqft,
      });
      if (customers.some((x) => x.id === c.id)) throw Error("duplicate");
      customers.push(c);
      if (r.property_type !== undefined || r.sqft !== undefined)
        warnings.push(
          `${c.id}: Property type and floor area used alternate labels and were read successfully. No action needed.`,
        );
    } catch {
      warnings.push(
        `Customer record ${index + 1} could not be loaded because details are invalid or duplicated. Ask the office to review the source record.`,
      );
    }
  });
  return { customers, warnings };
}
export const { customers, warnings: customerWarnings } =
  normalizeCustomers(rawCustomers);
warnings.push(...customerWarnings);
export function validQuantity(item: Item, q: number) {
  return (
    Number.isFinite(q) &&
    q > 0 &&
    q <= 100 &&
    (item.kind === "equipment"
      ? Number.isInteger(q)
      : Math.abs(q * 100 - Math.round(q * 100)) < 1e-8)
  );
}
export function lineTotal(item: Item, q: number) {
  if (!validQuantity(item, q))
    throw Error("Quantity must be 1–100 whole units or 0.01–100 hours");
  return Math.floor((item.cents * Math.round(q * 100) + 50) / 100);
}
export function total(lines: Line[]) {
  return lines.reduce((sum, l) => {
    const item = catalog.find((i) => i.id === l.id);
    if (!item) throw Error("Unknown item");
    return sum + lineTotal(item, l.quantity);
  }, 0);
}
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const inspectionSchema = z
  .object({
    system: z.string().trim().min(1).max(120),
    issue: z.string().trim().min(3).max(1000),
    condition: z.enum(["Unknown", "Good", "Worn", "Failed"]),
    age: z
      .string()
      .max(3)
      .regex(/^\d{0,3}$/),
    specs: z.string().max(500),
    job: z.enum(["diagnostic", "repair", "install", "maintenance", "ductwork"]),
    urgency: z.enum(["Routine", "Soon", "Urgent"]),
    notes: z.string().max(1000),
  })
  .strict();
export type Inspection = z.infer<typeof inspectionSchema>;
export const suggestionSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({
            catalogId: z.string(),
            quantity: z.number(),
            reason: z.string().min(1).max(400),
            requiresVerification: z.literal(true),
          })
          .strict(),
      )
      .max(12),
    missingInformation: z.array(z.string().min(1).max(300)).max(10),
    assumptions: z.array(z.string().min(1).max(300)).max(10),
  })
  .strict()
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.recommendations.forEach((r, index) => {
      const item = catalog.find((i) => i.id === r.catalogId);
      if (!item || !validQuantity(item, r.quantity) || seen.has(r.catalogId))
        ctx.addIssue({
          code: "custom",
          message: "Unknown ID, duplicate or unsupported quantity",
          path: ["recommendations", index],
        });
      seen.add(r.catalogId);
    });
  });
export type Suggestions = z.infer<typeof suggestionSchema>;
