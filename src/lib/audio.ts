import { speakText, SpeechResult } from "./speech";
import { recordUsage } from "./usage";

export type AudioEngine = "system" | "elevenlabs" | "azure";

function playBlob(blob: Blob, voiceName: string): Promise<SpeechResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const finish = (result: SpeechResult) => { URL.revokeObjectURL(url); resolve(result); };
    audio.onended = () => finish({ ok: true, voiceName });
    audio.onerror = () => finish({ ok: false, message: `The ${voiceName} audio file could not be played.` });
    audio.play().catch(() => finish({ ok: false, message: "Audio was blocked. Allow sound for this site and try again." }));
  });
}

export async function playText(text: string, lang: "de-DE" | "en-US"): Promise<SpeechResult> {
  const engine = (localStorage.getItem("tts-engine") || "system") as AudioEngine;
  if (engine === "system") {
    const result = await speakText(text, lang);
    if (!result.ok) window.dispatchEvent(new CustomEvent("language-islands:audio-help", { detail: result.message }));
    return result;
  }

  const isAzure = engine === "azure";
  const apiKey = sessionStorage.getItem(isAzure ? "azure-speech-api-key" : "elevenlabs-api-key");
  if (!apiKey) return { ok: false, message: `Add and test your ${isAzure ? "Azure Speech" : "ElevenLabs"} key in Settings first.` };
  const voiceId = isAzure
    ? localStorage.getItem(lang === "de-DE" ? "azure-german-voice" : "azure-english-voice") || (lang === "de-DE" ? "de-DE-KatjaNeural" : "en-US-JennyNeural")
    : localStorage.getItem(lang === "de-DE" ? "elevenlabs-german-voice" : "elevenlabs-english-voice") || "21m00Tcm4TlvDq8ikWAM";
  const region = isAzure ? localStorage.getItem("azure-speech-region") || "" : undefined;
  if (isAzure && !region) return { ok: false, message: "Add your Azure Speech region in Settings first." };
  try {
    recordUsage("tts", text.length);
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: engine, text, voiceId, apiKey, region, languageCode: lang.slice(0, 2) }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, message: data.error || `${isAzure ? "Azure Speech" : "ElevenLabs"} could not generate audio.` };
    }
    return playBlob(await response.blob(), isAzure ? `Azure · ${voiceId}` : "ElevenLabs");
  } catch {
    return { ok: false, message: `Could not reach ${isAzure ? "Azure Speech" : "ElevenLabs"}. Check your connection and try again.` };
  }
}
