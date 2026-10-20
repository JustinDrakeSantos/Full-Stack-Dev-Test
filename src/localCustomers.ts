import { z } from "zod";
export const localCustomerSchema = z
  .object({
    id: z.string().regex(/^LOCAL-[0-9a-f-]{36}$/),
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(240),
    propertyType: z.enum(["residential", "commercial", "Unknown"]),
    systemType: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(40).optional(),
    squareFootage: z.number().int().positive().max(10000000).optional(),
    systemAge: z.number().int().nonnegative().max(200).optional(),
    lastServiceDate: z.string().optional(),
  })
  .strict();
export type LocalCustomer = z.infer<typeof localCustomerSchema>;
export const localCustomerListSchema = z
  .array(localCustomerSchema)
  .max(100)
  .refine(
    (records) => new Set(records.map((c) => c.id)).size === records.length,
    "Duplicate customer IDs",
  );
export function sameSite(
  a: { name: string; address: string },
  b: { name: string; address: string },
) {
  const clean = (s: string) =>
    s.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return (
    clean(a.name) === clean(b.name) && clean(a.address) === clean(b.address)
  );
}
