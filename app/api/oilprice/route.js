import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔑 Clé API chargée ?", !!process.env.OILPRICE_KEY);

    const res = await fetch("https://api.oilpriceapi.com/v1/prices/latest", {
      headers: {
        Authorization: `Token ${process.env.OILPRICE_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Erreur API OilPriceAPI: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({ price: data.data.price, formatted: data.data.formatted });
  } catch (e) {
    console.error("Erreur API pétrole backend:", e);
    return NextResponse.json({ price: null, formatted: "Indisponible" }, { status: 500 });
  }
}
