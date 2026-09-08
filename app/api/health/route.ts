import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "deal-velocity",
    provider: process.env.DATA_PROVIDER ?? "zillow_research",
    time: new Date().toISOString(),
  });
}
