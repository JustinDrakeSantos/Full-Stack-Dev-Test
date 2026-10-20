import { inspectionSchema, suggestionSchema, type Inspection } from "./domain";
export async function requestRecommendations(
  facts: Inspection,
  demo = false,
  request: typeof fetch = fetch,
) {
  const input = inspectionSchema.parse(facts);
  try {
    const response = await request(
      demo ? "/api/recommend/demo" : "/api/recommend",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw Error();
    const { mode, ...result } = await response.json();
    if ((mode !== "demo" && mode !== "live") || (demo && mode !== "demo"))
      throw Error();
    return { mode, suggestions: suggestionSchema.parse(result) };
  } catch {
    throw Error(
      "Recommendations unavailable or invalid. Try the no-charge demo or continue with the manual catalog.",
    );
  }
}
