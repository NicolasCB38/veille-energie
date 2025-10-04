// app/api/summary/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import Parser from "rss-parser";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

const RSS_URLS = [
  "https://www.world-nuclear-news.org/rss",
  "https://www.iaea.org/newscenter/news/rss",
  "https://www.nucnet.org/feed",
  "https://www.pv-magazine.com/feed/",
  "https://renewablesnow.com/news/rss/",
  "https://www.rechargenews.com/rss",
  "https://www.energy-storage.news/feed/",
  "https://windeurope.org/newsroom/feed/",
  "https://www.hydroreview.com/feed/",
  "https://cleantechnica.com/category/energy/feed/",
  "https://oilprice.com/rss/main",
  "https://www.rigzone.com/news/rss/",
  "https://www.naturalgasworld.com/rss",
  "https://www.hydrogeninsight.com/atom",
  "https://www.h2-view.com/rss/",
  "https://www.euractiv.com/section/energy-environment/feed/",
  "https://www.iea.org/rss/news.rss",
  "https://www.acer.europa.eu/rss.xml",
  "https://www.ofgem.gov.uk/news-and-updates/feed",
  "https://www.carbonbrief.org/feed/"
];

function fixAmpersands(xml) {
  return xml.replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)/g, "&amp;");
}

function cleanText(text) {
  if (!text) return "";
  try {
    return String(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

async function fetchAndParse(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  let xml = await res.text();
  xml = fixAmpersands(xml);
  return parser.parseString(xml);
}

const DAYS_WINDOW = 7;
function isRecent(pubDate) {
  const d = new Date(pubDate);
  return !isNaN(+d) && Date.now() - d.getTime() <= DAYS_WINDOW * 86400000;
}

function normalizeTitle(t) {
  return t.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

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

async function gatherArticles() {
  const settled = await Promise.allSettled(RSS_URLS.map(fetchAndParse));
  const feeds = settled.filter(r => r.status === "fulfilled").map(r => r.value);

  const seen = new Set();
  const items = [];

  feeds.forEach(feed => {
    (feed.items || []).forEach(item => {
      const title = cleanText(item.title);
      const snippet = cleanText(item.contentSnippet || item.content || item["content:encoded"] || "");
      const link = item.link || "";
      const pub = item.isoDate || item.pubDate;

      if (!title || !link || !isRecent(pub)) return;

      const key = normalizeTitle(title);
      if (seen.has(key)) return;
      seen.add(key);

      const sc = score(`${title} ${snippet}`);
      items.push({ title, snippet, link, pub, sc });
    });
  });

  items.sort((a, b) => b.sc - a.sc || (+new Date(b.pub) - +new Date(a.pub)));
  return items;
}

// 🗄️ Cache HTML
let cachedHTML = null;
let lastGenerated = null;

async function getHTMLSummary() {
  const now = Date.now();
  const ONE_HOUR = 3600000;

  if (cachedHTML && lastGenerated && now - lastGenerated < ONE_HOUR) {
    console.log("⚡ Résumé HTML servi depuis le cache");
    return cachedHTML;
  }

  console.log("⏳ Génération d'un nouveau résumé HTML");

  const items = await gatherArticles();
  const top = items.slice(0, 20);

  if (top.length === 0) {
    console.warn("🚨 Aucun article pertinent trouvé.");
    return "<p>Aucun article pertinent sur la période.</p>";
  }

  const prompt = top.map(i =>
    `- <strong>${i.title}</strong> — ${i.snippet}<br/>Source: <a href="${i.link}">${i.link}</a>`
  ).join("\n\n");

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-5-mini", // ← Gardé tel quel comme tu as confirmé qu’il fonctionne
      messages: [
        {
          role: "system",
          content:
            "Tu es un analyste énergie. Résume en français et structure le contenu en HTML propre et minimaliste. " +
            "Utilise <h2>, <p>, <ul>, <li>, <a>… Pas de Markdown. " +
            "Classe les infos par thèmes (Nucléaire, Renouvelables, Pétrole & Gaz, Marchés & Régulation). " +
            "Termine par une <h2>Conclusion</h2> avec 2–3 phrases synthétiques."
        },
        { role: "user", content: prompt }
      ],
    });
  } catch (err) {
    console.error("❌ Erreur lors de l'appel OpenAI:", err);
    return "<p>Erreur lors de l’appel à OpenAI. Vérifiez les logs.</p>";
  }

  const content = completion?.choices?.[0]?.message?.content;
  if (!content) {
    console.warn("⚠️ OpenAI n’a pas retourné de contenu");
    return "<p>Résumé vide ou indisponible.</p>";
  }

  cachedHTML = content;
  lastGenerated = now;
  return cachedHTML;
}

// ✅ Handler POST
export async function POST() {
  try {
    console.log("📩 POST reçu : génération en cours");
    const html = await getHTMLSummary();
    return NextResponse.json({ html });
  } catch (e) {
    console.error("❌ Erreur API (summary):", e);
    return NextResponse.json(
      { html: "<p>Erreur lors de la génération du résumé.</p>" },
      { status: 500 }
    );
  }
}
