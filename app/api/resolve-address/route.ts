import { NextResponse } from "next/server";
import { marketLocation } from "@/lib/market-location";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.address !== "string" || typeof body.city !== "string" || body.address.length > 250 || body.city.length > 100 || !body.address.trim()) {
      return NextResponse.json({ error: "Enter a street address and city/state." }, { status: 400 });
    }
    const address = body.address.trim();
    const full = address.includes(",") ? address : address + ", " + body.city.trim();
    const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
    url.search = new URLSearchParams({ address: full, benchmark: "Public_AR_Current", vintage: "Current_Current", format: "json" }).toString();
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Census lookup unavailable");
    const result = await response.json();
    const matches = result.result?.addressMatches ?? [];
    if (matches.length !== 1) return NextResponse.json({ error: "Census could not uniquely match this address. Add the full city, state and ZIP. City-level market selection still works, but the property location is not verified." }, { status: 422 });
    const match = matches[0];
    const county = match.geographies?.Counties?.[0];
    const city = match.addressComponents?.city;
    const state = match.addressComponents?.state;
    const countyMetro: Record<string,string> = { "12101":"Tampa, FL", "12057":"Tampa, FL", "12103":"Tampa, FL", "12053":"Tampa, FL", "12083":"Ocala, FL" };
    const resolved = countyMetro[county?.GEOID] ?? marketLocation(city + ", " + state).region;
    return NextResponse.json({ address: match.matchedAddress, coordinates: match.coordinates, county: county?.NAME ?? null, region: resolved, source: "U.S. Census Geocoder", note: "Address matched by Census. Market statistics remain metro-wide; no property valuation or attributes are supplied." }, { headers: { "Cache-Control":"no-store" } });
  } catch {
    return NextResponse.json({ error: "Address lookup is temporarily unavailable. You can still load a city/metro separately." }, { status: 503 });
  }
}
