import { catalog, validQuantity, type Line } from "./domain";
export const symptoms = [
  "Not cooling",
  "Not heating",
  "Unusual noise",
  "Poor airflow",
  "Water leak",
  "Routine maintenance",
] as const;
export function toggleSymptom(issue: string, symptom: string) {
  const parts = issue
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const next = (
    parts.includes(symptom)
      ? parts.filter((s) => s !== symptom)
      : [...parts, symptom]
  ).join("; ");
  return next.length > 1000 ? issue : next;
}
export function generateScope(lines: Line[]) {
  if (!lines.length) return "";
  const descriptions = lines.map((l) => {
    const item = catalog.find((i) => i.id === l.id);
    if (!item || !validQuantity(item, l.quantity))
      throw Error("Invalid selected item");
    return `• ${item.name}: ${l.quantity} ${item.kind === "labor" ? "labor hours" : "unit(s)"}.`;
  });
  return [
    "Proposed scope based on technician-selected items:",
    ...descriptions,
    "Confirm diagnosis, equipment compatibility and agreed scope before proceeding. No completed work or verified diagnosis is implied.",
  ].join("\n");
}
