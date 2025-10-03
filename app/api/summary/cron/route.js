export async function GET() {
  // On appelle la même logique que la génération POST
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/summary`, {
    method: "POST",
  });

  if (!res.ok) {
    return new Response("Erreur CRON", { status: 500 });
  }

  return new Response("Résumé régénéré via CRON ✅");
}
