import { speakText, SpeechResult } from "./speech";
import { recordUsage } from "./usage";

export type AudioEngine = "system" | "elevenlabs" | "azure";

let activeAudio: HTMLAudioElement | null = null;
let finishActiveAudio: ((result: SpeechResult) => void) | null = null;

// Cloud audio arrives after a network request. Prime the same element while the
// click/tap is still active so Safari and stricter mobile browsers permit the
// generated clip to start once it has downloaded.
const silentWav = "data:audio/wav;base64,UklGRioAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQYAAACAgICAgA==";

function primeCloudAudio() {
  const audio = new Audio(silentWav);
  audio.preload = "auto";
  audio.volume = 1;
  void audio.play().catch(() => undefined);
  return audio;
}

function playBlob(blob: Blob, voiceName: string, rate: number, audio: HTMLAudioElement): Promise<SpeechResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (result: SpeechResult) => {
      if (settled) return;
      settled = true;
      if (activeAudio === audio) { activeAudio = null; finishActiveAudio = null; }
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(url);
      resolve(result);
    };
    activeAudio = audio;
    finishActiveAudio = finish;
    audio.src = url;
    audio.playbackRate = rate;
    audio.onended = () => finish({ ok: true, voiceName });
    audio.onerror = () => finish({ ok: false, message: `The ${voiceName} audio file could not be played.` });
    audio.play().catch(() => finish({ ok: false, message: "Audio was blocked. Allow sound for this site and try again." }));
  });
}

export function stopAudio() {
  window.speechSynthesis?.cancel();
  if (activeAudio) { activeAudio.pause(); activeAudio.removeAttribute("src"); activeAudio.load(); }
  finishActiveAudio?.({ ok: true });
}

export async function playText(text: string, lang: "de-DE" | "en-US", rate = 1): Promise<SpeechResult> {
  const engine = (localStorage.getItem("tts-engine") || "system") as AudioEngine;
  if (engine === "system") {
    const result = await speakText(text, lang, rate);
    if (!result.ok) window.dispatchEvent(new CustomEvent("language-islands:audio-help", { detail: result.message }));
    return result;
  }

  const audio = primeCloudAudio();
  const isAzure = engine === "azure";
  const apiKey = sessionStorage.getItem(isAzure ? "azure-speech-api-key" : "elevenlabs-api-key");
  if (!apiKey) {
    audio.pause();
    return { ok: false, message: `This device does not have your ${isAzure ? "Azure Speech" : "ElevenLabs"} key. Add and test it in Settings first.` };
  }
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
    const blob = await response.blob();
    if (!blob.size) return { ok: false, message: `${isAzure ? "Azure Speech" : "ElevenLabs"} returned an empty audio file.` };
    return playBlob(blob, isAzure ? `Azure · ${voiceId}` : "ElevenLabs", rate, audio);
  } catch {
    audio.pause();
    return { ok: false, message: `Could not reach ${isAzure ? "Azure Speech" : "ElevenLabs"}. Check your connection and try again.` };
  }
}
