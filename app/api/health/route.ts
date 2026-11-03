import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "deal-velocity",
    version: "1.4.0",
    mode: "hybrid_comp_workspace",
    propertyLevelUnderwriting: "user_supplied_records_only",
    provider: process.env.DATA_PROVIDER ?? "zillow_research",
    time: new Date().toISOString(),
  });
}
