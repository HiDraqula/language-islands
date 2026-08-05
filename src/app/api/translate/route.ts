import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, targetLang = "DE", apiKey } = await request.json();
    if (!text || typeof text !== "string" || text.length > 5000 || !apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Text and API key are required." }, { status: 400 });
    }
    const endpoint = apiKey.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: [text], target_lang: targetLang }) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.message || "DeepL request failed." }, { status: response.status });
    return NextResponse.json({ translation: data.translations?.[0]?.text });
  } catch { return NextResponse.json({ error: "Translation request failed." }, { status: 500 }); }
}
