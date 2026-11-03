import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "deal-velocity",
    version: "1.2.1",
    mode: "market_screening",
    propertyLevelUnderwriting: false,
    provider: process.env.DATA_PROVIDER ?? "zillow_research",
    time: new Date().toISOString(),
  });
}
