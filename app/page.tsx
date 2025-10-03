"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "@/components/ThemeToggle";


export default function EnergyNewsApp() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDailySummary = async () => {
    setLoading(true);

    try {
      const res = await fetch("https://api.the-energy-briefs.com/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setSummary("⚠️ Erreur côté serveur.");
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error("Erreur côté front:", err);
      setSummary("⚠️ Erreur réseau côté client.");
    }

    setLoading(false);
  };

  const categories = [
    {
      name: "Nucléaire",
      description: "Dernières actualités sur le nucléaire.",
      image: "/images/nucleaire.jpg",
    },
    {
      name: "Renouvelables",
      description: "Actus sur le solaire, l’éolien, etc.",
      image: "/images/renouvelables.jpg",
    },
    {
      name: "Pétrole & Gaz",
      description: "Tendances et marché des hydrocarbures.",
      image: "/images/petrole_gaz.jpg",
    },
    {
      name: "Marchés & Régulation",
      description: "Régulations, politiques et tendances macro.",
      image: "/images/regulation.jpg",
    },
  ];

  return (
    <div className="min-h-screen transition-colors duration-500 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-950 shadow-md px-6 py-4 flex justify-between items-center transition-colors duration-500">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
          ⚡ Veille Énergie
        </h1>
        <div className="flex items-center space-x-4">
          <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            Accueil
          </a>
          <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            Catégories
          </a>
          <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
            Résumé du jour
          </a>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero section */}
      <header className="relative h-[400px] flex items-center justify-center text-center text-white transition-colors duration-500">
        <img
          src="/images/renouvelables.jpg"
          alt="Énergie renouvelable"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80"></div>
        <div className="relative z-10">
          <h2 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
            Veille Énergie
          </h2>
          <p className="mb-6 text-xl text-gray-200 max-w-2xl mx-auto">
            Suivez chaque jour l’actualité mondiale de l’énergie, résumée pour les décideurs.
          </p>
          <Button
            onClick={fetchDailySummary}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-full shadow-lg transition-colors duration-500"
          >
            {loading ? "⏳ Génération..." : "⚡ Résumé du jour"}
          </Button>
        </div>
      </header>

      {/* Résumé du jour */}
      {summary && (
        <div className="max-w-4xl mx-auto mt-10 px-6">
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700 transition-colors duration-500">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <CardTitle className="text-xl">📊 Résumé du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ node, ...props }) => {
                      const text = String(props.children);
                      let color = "text-blue-600";
                      let icon = "📌";

                      if (text.includes("Nucléaire")) {
                        color = "text-purple-600";
                        icon = "⚛️";
                      }
                      if (text.includes("Renouvelables")) {
                        color = "text-green-600";
                        icon = "🌱";
                      }
                      if (text.includes("Pétrole") || text.includes("Gaz")) {
                        color = "text-orange-600";
                        icon = "🛢️";
                      }
                      if (text.includes("Marchés") || text.includes("Régulation")) {
                        color = "text-pink-600";
                        icon = "⚖️";
                      }
                      if (text.includes("Conclusion")) {
                        color = "text-gray-800 dark:text-gray-200";
                        icon = "📝";
                      }
                      if (text.includes("Sources")) {
                        return (
                          <h3 className="text-sm italic text-gray-500 dark:text-gray-400 mt-2 mb-1" {...props} />
                        );
                      }

                      return (
                        <h2 className={`text-2xl font-bold mt-6 mb-3 flex items-center gap-2 ${color}`} {...props}>
                          <span>{icon}</span> {text}
                        </h2>
                      );
                    },
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm italic text-blue-600 dark:text-blue-400 hover:underline"
                      />
                    ),
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Catégories */}
      <section className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mt-12 px-6">
        {categories.map((cat) => (
          <Card key={cat.name} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow">
            <img src={cat.image} alt={cat.name} className="h-40 w-full object-cover" />
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">{cat.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-950 text-center py-6 mt-12 text-gray-500 dark:text-gray-400 text-sm transition-colors duration-500">
        © {new Date().getFullYear()} Veille Énergie – Propulsé par Next.js & OpenAI
      </footer>
    </div>
  );
}
