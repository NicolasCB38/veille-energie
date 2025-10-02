import { NextResponse } from "next/server";
import OpenAI from "openai";
import Parser from "rss-parser";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

// 🌍 TOP 20 sources énergie (sélectionnées comme les plus pertinentes et diversifiées)
const RSS_URLS = [
  "https://www.world-nuclear-news.org/rss",     // Nucléaire
  "https://www.iaea.org/newscenter/news/rss",   // Agence internationale énergie atomique
  "https://www.nucnet.org/feed",                // Nucléaire
  "https://www.pv-magazine.com/feed/",          // Solaire
  "https://renewablesnow.com/news/rss/",        // Renouvelables général
  "https://www.rechargenews.com/rss",           // Stockage / renouvelables
  "https://www.energy-storage.news/feed/",      // Batteries
  "https://windeurope.org/newsroom/feed/",      // Éolien
  "https://www.hydroreview.com/feed/",          // Hydro
  "https://cleantechnica.com/category/energy/feed/", // Transition énergie
  "https://oilprice.com/rss/main",              // Marché pétrole
  "https://www.rigzone.com/news/rss/",          // Industrie pétrolière
  "https://www.naturalgasworld.com/rss",        // Gaz naturel
  "https://www.hydrogeninsight.com/atom",       // Hydrogène
  "https://www.h2-view.com/rss/",               // Hydrogène
  "https://www.euractiv.com/section/energy-environment/feed/", // UE énergie & climat
  "https://www.iea.org/rss/news.rss",           // Agence internationale de l’énergie
  "https://www.acer.europa.eu/rss.xml",         // Régulateur européen
  "https://www.ofgem.gov.uk/news-and-updates/feed", // Régulateur UK
  "https://www.carbonbrief.org/feed/"           // Décryptage climat & énergie
];

// 🧹 Nettoyage des caractères spéciaux (&)
function fixAmpersands(xml) {
  return xml.replace(
    /&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)/g,
    "&amp;"
  );
}

// 🧹 Nettoyage du texte
function cleanText(text) {
  if (!text) return "";
  try {
    const str = String(text);
    return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

// 📡 Parsing RSS
async function fetchAndParse(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
      accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  let xml = await res.text();
  xml = fixAmpersands(xml);
  return parser.parseString(xml);
}

// 🕒 Articles récents (7 jours)
const DAYS_WINDOW = 7;
function isRecent(pubDate) {
  if (!pubDate) return true;
  const d = new Date(pubDate);
  if (isNaN(+d)) return true;
  return Date.now() - d.getTime() <= DAYS_WINDOW * 24 * 3600 * 1000;
}

// 🔎 Normalisation pour éviter doublons
function normalizeTitle(t) {
  return t.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

// 📊 Scoring thématique
const WEIGHTS = {
  nuclear: 3, nucléaire: 3, reactor: 2, epr: 3, smr: 3,
  solar: 2, pv: 2, éolien: 2, wind: 2, offshore: 2,
  battery: 2, storage: 2, hydrogen: 3, hydrogène: 3,
  lng: 3, gas: 2, pipeline: 2, refinery: 1,
  ppa: 3, lcoe: 2, capex: 2, opex: 2, auction: 2,
  grid: 2, blackout: 3, outage: 2, eu: 1,
  ets: 2, regulation: 2, price: 1, ttf: 2, brent: 2,
  opec: 2, carbon: 2, cbam: 2
};

function score(text) {
  let s = 0;
  const body = text.toLowerCase();
  for (const k in WEIGHTS) {
    if (body.includes(k)) s += WEIGHTS[k];
  }
  const quant = (body.match(/\b\d+(\.\d+)?\s?(gw|mw|twh|mwh|%|€|\$|billion|million)\b/g) || []).length;
  return s + quant;
}

// 📥 Récupération articles
async function gatherArticles() {
  const settled = await Promise.allSettled(RSS_URLS.map((u) => fetchAndParse(u)));
  const feeds = settled.filter(r => r.status === "fulfilled").map(r => r.value);

  const seen = new Set();
  const items = [];

  feeds.forEach(feed => {
    (feed.items || []).forEach(item => {
      const title = cleanText(item.title);
      const snippet = cleanText(item.contentSnippet || item.content || item["content:encoded"] || "");
      const link = item.link || "";
      const pub = item.isoDate || item.pubDate;

      if (!title || !link) return;
      if (!isRecent(pub)) return;

      const key = normalizeTitle(title);
      if (seen.has(key)) return;
      seen.add(key);

      const sc = score(`${title} ${snippet}`);
      items.push({ title, snippet, link, pub, sc });
    });
  });

  items.sort((a, b) => (b.sc - a.sc) || ((b.pub ? +new Date(b.pub) : 0) - (a.pub ? +new Date(a.pub) : 0)));
  return items;
}

// 🗄️ Cache résumé
let cachedSummary = null;
let lastGenerated = null;

async function getSummary() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (cachedSummary && lastGenerated && now - lastGenerated < ONE_HOUR) {
    console.log("⚡ Résumé servi depuis le cache");
    return cachedSummary;
  }

  console.log("⏳ Nouveau résumé généré");
  const items = await gatherArticles();
  const TOP_N = 20; // max 20 articles
  const top = items.slice(0, TOP_N);

  if (top.length === 0) return "Aucun article pertinent sur la période.";

  const prompt = top.map(i =>
    `- **${i.title}** — ${i.snippet}\n  Source: ${i.link}`
  ).join("\n\n");

  const completion = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu es un analyste énergie. Résume en français et structure le contenu en Markdown. " +
          "Classe les infos par thèmes (Nucléaire, Renouvelables, Pétrole & Gaz, Marchés & Régulation). " +
          "À la fin de chaque section, ajoute '### Sources' avec une liste de liens cliquables. " +
          "Ajoute enfin une '### Conclusion' (2–3 phrases)."
      },
      { role: "user", content: prompt },
    ],
  });

  cachedSummary = completion.choices[0].message?.content ?? "Résumé indisponible.";
  lastGenerated = now;
  return cachedSummary;
}

// 🚀 Endpoint API
export async function POST() {
  try {
    const summary = await getSummary();
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("Erreur API (summary):", e);
    return NextResponse.json({ summary: "Erreur lors de la génération du résumé." }, { status: 500 });
  }
}
