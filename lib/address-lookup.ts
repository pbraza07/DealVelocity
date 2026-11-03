// County records supplement Census coverage; never use a city centroid as a house.
export function normalizeStreet(value: string) {
  const words: Record<string,string> = { DRIVE:"DR", STREET:"ST", ROAD:"RD", AVENUE:"AVE", LANE:"LN", COURT:"CT", BOULEVARD:"BLVD", CIRCLE:"CIR", PLACE:"PL", TERRACE:"TER", PARKWAY:"PKWY" };
  return value.toUpperCase().replace(/\./g, "").trim().split(/\s+/).map(w => words[w] ?? w).join(" ");
}

export function addressInput(address: string, context: string) {
  const clean = address.trim().replace(/\s+/g," ");
  return clean.includes(",") ? clean : clean + ", " + context.trim();
}

export async function pascoAddress(full: string) {
  // Only query Florida addresses with an explicit city. ZIP, when supplied, must agree.
  const parts = full.match(/^(.+?),\s*(.+?),?\s+(FL|Florida)\s*(\d{5}(?:-\d{4})?)?$/i);
  if (!parts) return null;
  const street = normalizeStreet(parts[1]);
  const city = parts[2].replace(/,$/, "").trim().toUpperCase();
  const prefix = street.match(/^\d+[A-Z]?\s+[A-Z0-9]+/)?.[0];
  if (!prefix || !city || /[#]/.test(street)) return null;
  const quote = (s: string) => s.replace(/'/g,"''");
  const url = new URL("https://maps.pascopa.com/arcgis/rest/services/Parcels/MapServer/3/query");
  url.search = new URLSearchParams({
    f:"json", where:`PHYS_STREET LIKE '${quote(prefix)} %' AND PHYS_CITY = '${quote(city)}'`,
    outFields:"DIR_ID,PHYS_STREET,PHYS_CITY,PHYS_STATE,PHYS_ZIP",
    returnGeometry:"false", resultRecordCount:"50",
  }).toString();
  const response = await fetch(url, { next:{revalidate:86400}, signal:AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("County lookup unavailable");
  const data = await response.json();
  if (data.error) throw new Error("County lookup unavailable");
  if (data.exceededTransferLimit) return null;
  type Parcel = { DIR_ID:string; PHYS_STREET:string; PHYS_CITY:string; PHYS_STATE:string; PHYS_ZIP:string };
  const matches: Parcel[] = (data.features ?? []).map((f:{attributes:Parcel})=>f.attributes).filter((p:Parcel)=>
    normalizeStreet(p.PHYS_STREET) === street && p.PHYS_CITY.trim().toUpperCase() === city && p.PHYS_STATE === "FL" &&
    (!parts[4] || p.PHYS_ZIP === parts[4].slice(0,5)));
  if (matches.length !== 1 || !/^\d+$/.test(matches[0].DIR_ID)) return null;
  const p = matches[0];
  return { address:`${p.PHYS_STREET.trim()}, ${p.PHYS_CITY}, FL ${p.PHYS_ZIP}`,
    coordinates:null, county:"Pasco County", region:"Tampa, FL", matchType:"county_parcel",
    source:"Pasco County Property Appraiser", sourceUrl:`https://search.pascopa.com/parcel.aspx?parcel=${p.DIR_ID}`,
    note:"Exact physical address matched to a county parcel. Market statistics are Tampa metro-wide, not property-level comps. Parcel address matching does not validate your ARV." };
}
