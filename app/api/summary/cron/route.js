import { NextResponse } from "next/server";

export async function GET(req) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}


console.log("CRON_SECRET on server:", process.env.CRON_SECRET);