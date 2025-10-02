"use client";

import { useEffect, useState } from "react";

export default function OilPriceWidget() {
  const [price, setPrice] = useState<string>("⏳");

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch("/api/oilprice");
        const data = await res.json();

        if (data && data.formatted) {
          // Exemple: "$64.36"
          setPrice(`${data.formatted} /bbl`);
        } else if (data && data.price) {
          // fallback si pas de "formatted"
          setPrice(`${data.price} USD/bbl`);
        } else {
          setPrice("Indisponible");
        }
      } catch (e) {
        console.error("Erreur widget pétrole:", e);
        setPrice("Indisponible");
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 300000); // refresh toutes les 5 min
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      🛢️ {price}
    </span>
  );
}
