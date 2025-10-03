import { NextResponse } from "next/server";

export async function GET(req) {
  // Auth simple
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

console.log("CRON_SECRET on server:", process.env.CRON_SECRET);