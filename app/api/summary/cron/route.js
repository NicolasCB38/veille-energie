import { NextResponse } from "next/server";

export async function GET(req) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  console.log("🔑 Received Authorization header:", authHeader);
  console.log("🔐 Expected:", `Bearer ${process.env.CRON_SECRET}`);

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ⚡ Ici tu peux mettre la logique réelle du cron (génération résumé)
  return NextResponse.json({ ok: true });
}
