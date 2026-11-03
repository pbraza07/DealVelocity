import { NextResponse } from "next/server";
import { marketLocation } from "@/lib/market-location";
import { addressInput, pascoAddress } from "@/lib/address-lookup";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.address !== "string" || typeof body.city !== "string" || body.address.length > 250 || body.city.length > 100 || !body.address.trim()) {
      return NextResponse.json({ error: "Enter a street address and city/state." }, { status: 400 });
    }
    const address = body.address.trim();
    const full = addressInput(address, body.city);
    // An independent public parcel source covers newer streets missing from Census.
    // Failure of one provider must not prevent the other provider from responding.
    const parcel = await pascoAddress(full).catch(() => null);
    if (parcel) return NextResponse.json(parcel, { headers:{"Cache-Control":"no-store"} });
    const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
    url.search = new URLSearchParams({ address: full, benchmark: "Public_AR_Current", vintage: "Current_Current", format: "json" }).toString();
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Census lookup unavailable");
    const result = await response.json();
    const matches = result.result?.addressMatches ?? [];
    if (matches.length !== 1) return NextResponse.json({ error: "No unique property match was found in the available public address sources. Use Street, City, State ZIP (for example: 29970 Chapel Chase Dr, Wesley Chapel, FL 33545). You can load a city market separately; this does not verify the property." }, { status: 422 });
    const match = matches[0];
    const county = match.geographies?.Counties?.[0];
    const city = match.addressComponents?.city;
    const state = match.addressComponents?.state;
    const countyMetro: Record<string,string> = { "12101":"Tampa, FL", "12057":"Tampa, FL", "12103":"Tampa, FL", "12053":"Tampa, FL", "12083":"Ocala, FL" };
    const resolved = countyMetro[county?.GEOID] ?? (await marketLocation(city + ", " + state)).region;
    return NextResponse.json({ address: match.matchedAddress, coordinates: match.coordinates, county: county?.NAME ?? null, region: resolved, matchType:"census_address_range", source: "U.S. Census Geocoder", sourceUrl:"https://geocoding.geo.census.gov/", note: "Address matched to a Census street range, not a verified rooftop or parcel. Market statistics remain metro-wide; no property valuation or attributes are supplied." }, { headers: { "Cache-Control":"no-store" } });
  } catch {
    return NextResponse.json({ error: "Address lookup is temporarily unavailable. You can still load a city/metro separately." }, { status: 503 });
  }
}
