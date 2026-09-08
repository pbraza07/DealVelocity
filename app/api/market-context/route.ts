import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") ?? process.env.DEFAULT_MARKET_REGION ?? "Tampa, FL").trim();
  if (!region || region.length > 100) {
    return NextResponse.json({ ok: false, error: "Enter a valid metro name." }, { status: 400 });
  }

  try {
    const snapshot = await getMarketDataProvider().getMarketSnapshot(region);
    const hasData = Object.values(snapshot.metrics).some((metric) => metric.value !== null);
    return NextResponse.json(
      { ok: hasData, snapshot, error: hasData ? undefined : `No Zillow Research metro row matched “${region}”.` },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "The configured data provider is unavailable." },
      { status: 503 },
    );
  }
}
