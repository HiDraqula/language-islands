import { NextResponse } from "next/server";

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[character] || character);
}

export async function POST(request: Request) {
  try {
    const { provider = "elevenlabs", text, voiceId, apiKey, region, languageCode } = await request.json();
    if (typeof text !== "string" || !text.trim() || text.length > 2500 || typeof voiceId !== "string" || !voiceId || typeof apiKey !== "string" || !apiKey) {
      return NextResponse.json({ error: "Text, voice and ElevenLabs API key are required." }, { status: 400 });
    }
    if (provider === "azure") {
      if (typeof region !== "string" || !/^[a-z0-9-]+$/i.test(region)) return NextResponse.json({ error: "A valid Azure Speech region is required." }, { status: 400 });
      const speechResponse = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "Language-Islands",
        },
        body: `<speak version="1.0" xml:lang="${languageCode === "de" ? "de-DE" : "en-US"}"><voice name="${escapeXml(voiceId)}">${escapeXml(text.trim())}</voice></speak>`,
      });
      if (!speechResponse.ok) {
        const message = (await speechResponse.text().catch(() => "")).slice(0, 300) || "Azure Speech request failed. Check the key, region and voice name.";
        return NextResponse.json({ error: message }, { status: speechResponse.status });
      }
      return new Response(await speechResponse.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
    }
    if (provider !== "elevenlabs") return NextResponse.json({ error: "Unsupported audio provider." }, { status: 400 });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", language_code: languageCode, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = data?.detail?.message || data?.detail?.status || "ElevenLabs request failed.";
      return NextResponse.json({ error: message }, { status: response.status });
    }
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Audio generation failed." }, { status: 500 });
  }
}
