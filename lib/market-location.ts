// Explicit crosswalk: Wesley Chapel is in Pasco County, Tampa CBSA 45300.
// https://edr.state.fl.us/Content/population-demographics/data/MSA-2024-2023Delineation.pdf
export function marketLocation(input: string) {
  const normalized = input.trim().replace(/\bFlorida\b/gi, "FL").replace(/\s+/g, " ");
  if (/^(Wesley Chapel|Tampa|St\.? Petersburg|Clearwater),?\s+FL$/i.test(normalized)) {
    return { region: "Tampa, FL", note: normalized + " → Tampa–St. Petersburg–Clearwater metro (Zillow label: Tampa, FL). These are regional statistics, not city or neighborhood comps." };
  }
  return { region: normalized, note: "" };
}
