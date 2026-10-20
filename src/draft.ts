import { localCustomerListSchema } from "./localCustomers";
import { z } from "zod";
import {
  catalog,
  customers,
  inspectionSchema,
  validQuantity,
  type Inspection,
} from "./domain";
export const initialInspection: Inspection = {
  system: "",
  issue: "",
  condition: "Unknown",
  age: "",
  specs: "",
  job: "diagnostic",
  urgency: "Routine",
  notes: "",
};
export const presentationSchema = z
  .object({
    businessName: z.string().max(100),
    title: z.string().max(120),
    assumptions: z.string().max(2000),
    exclusions: z.string().max(2000),
  })
  .strict();
export type Presentation = z.infer<typeof presentationSchema>;
export const defaultPresentation: Presentation = {
  businessName: "FieldQuote AI",
  title: "HVAC service estimate",
  assumptions: "",
  exclusions: "",
};
const draftSchema = z
  .object({
    customerId: z.string(),
    localCustomers: localCustomerListSchema.optional(),
    lines: z
      .array(z.object({ id: z.string(), quantity: z.number() }).strict())
      .max(catalog.length)
      .refine(
        (lines) =>
          new Set(lines.map((l) => l.id)).size === lines.length &&
          lines.every((l) => {
            const i = catalog.find((i) => i.id === l.id);
            return i && validQuantity(i, l.quantity);
          }),
      ),
    inspection: inspectionSchema.extend({
      system: z.string().max(120),
      issue: z.string().max(1000),
    }),
    notes: z.string().max(6000),
    presentation: presentationSchema.optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.customerId === "" ||
      customers.some((c) => c.id === d.customerId) ||
      d.localCustomers?.some((c) => c.id === d.customerId),
    "Unknown selected customer",
  );
export function parseDraft(input: unknown) {
  const result = draftSchema.safeParse(input);
  return result.success ? result.data : null;
}
