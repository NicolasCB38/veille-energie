import { NextResponse } from "next/server";
import { getHTMLSummary } from "@/lib/summary";

export async function GET(req) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const html = await getHTMLSummary(true); // Force refresh
    return NextResponse.json({ regenerated: true, length: html.length });
  } catch (err) {
    console.error("❌ Cron job failed:", err);
    return NextResponse.json({ error: "Failed to regenerate" }, { status: 500 });
  }
}
