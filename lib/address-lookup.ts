// County records supplement Census coverage; never use a city centroid as a house.
export function normalizeStreet(value: string) {
  const words: Record<string,string> = { DRIVE:"DR", STREET:"ST", ROAD:"RD", AVENUE:"AVE", LANE:"LN", COURT:"CT", BOULEVARD:"BLVD", CIRCLE:"CIR", PLACE:"PL", TERRACE:"TER", PARKWAY:"PKWY" };
  return cleanAddress(value).split(/\s+/).map(w => words[w] ?? w).join(" ");
}

const states = "AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|PR:Puerto Rico".split("|").map(s=>s.toUpperCase().split(":"));

// Keep unit identifiers, hyphens and fractions: removing them can change the property.
export function cleanAddress(value: string) {
  return value.normalize("NFKC").toUpperCase().replace(/[’']/g, "'")
    .replace(/\b([A-Z])\.([A-Z])\.(?=\s|$)/g,"$1$2")
    .replace(/[.,;:\n\r\t]+/g," ").replace(/\s+/g," ").trim()
    .replace(/(?:\s+)(?:UNITED STATES(?: OF AMERICA)?|USA|US)$/,"" );
}

function canonicalState(value: string) {
  for (const [code,name] of states) {
    const re = new RegExp(`(?:^| )(${code}|${name})(?= *(?:\\d{5}(?:-\\d{4})?)?$)`);
    if (re.test(value)) return {text:value.replace(re, m => (m.startsWith(" ")?" ":"")+code),code};
  }
  return null;
}

export function addressInput(address: string, context: string) {
  const clean = cleanAddress(address);
  const explicit = canonicalState(clean);
  // Never append the selected market to an already complete address.
  if (explicit) return explicit.text;
  if (/\b\d{5}(?:-\d{4})?$/.test(clean)) return clean;
  const location = canonicalState(cleanAddress(context));
  if (!location) return clean;
  const city = location.text.slice(0,-location.code.length).trim();
  if (city && clean.endsWith(" "+city)) return clean+" "+location.code;
  const normalized = normalizeStreet(clean);
  // Only inherit market context for an apparent street-only entry. Do not
  // silently replace a different city typed by the user.
  if (/\b(?:DR|ST|RD|AVE|LN|CT|BLVD|CIR|PL|TER|PKWY|WAY|HWY|TRAIL|TRL)(?: (?:N|S|E|W|NE|NW|SE|SW))?(?: (?:APT|UNIT|SUITE|STE|#) ?[\w-]+)?$/.test(normalized)) {
    return clean+" "+location.text;
  }
  return clean;
}

export async function pascoAddress(full: string) {
  // Only query Florida addresses with an explicit city. ZIP, when supplied, must agree.
  const prepared = addressInput(full, "");
  const parts = prepared.match(/^(.+?)\s+FL\s*(\d{5}(?:-\d{4})?)?$/);
  if (!parts) return null;
  const streetAndCity = normalizeStreet(parts[1]);
  const prefix = streetAndCity.match(/^\d+[A-Z]?\s+[A-Z0-9]+/)?.[0];
  if (!prefix || /[#]/.test(streetAndCity)) return null;
  const quote = (s: string) => s.replace(/'/g,"''");
  const url = new URL("https://maps.pascopa.com/arcgis/rest/services/Parcels/MapServer/3/query");
  url.search = new URLSearchParams({
    f:"json", where:`PHYS_STREET LIKE '${quote(prefix)} %'`,
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
    normalizeStreet(p.PHYS_STREET+" "+p.PHYS_CITY) === streetAndCity && p.PHYS_STATE === "FL" &&
    (!parts[2] || p.PHYS_ZIP === parts[2].slice(0,5)));
  if (matches.length !== 1 || !/^\d+$/.test(matches[0].DIR_ID)) return null;
  const p = matches[0];
  return { address:`${p.PHYS_STREET.trim()}, ${p.PHYS_CITY}, FL ${p.PHYS_ZIP}`,
    coordinates:null, county:"Pasco County", region:"Tampa, FL", matchType:"county_parcel",
    source:"Pasco County Property Appraiser", sourceUrl:`https://search.pascopa.com/parcel.aspx?parcel=${p.DIR_ID}`,
    note:"Exact physical address matched to a county parcel. Market statistics are Tampa metro-wide, not property-level comps. Parcel address matching does not validate your ARV." };
}
