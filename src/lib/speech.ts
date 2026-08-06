export type SpeechResult = { ok: true; voiceName?: string } | { ok: false; message: string };

export function loadSystemVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, timeoutMs);
  });
}

export async function speakText(text: string, lang: "de-DE" | "en-US", rate = 1): Promise<SpeechResult> {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return { ok: false, message: "Speech synthesis is not supported by this browser." };
  }

  const synth = window.speechSynthesis;
  const voices = await loadSystemVoices();
  const languagePrefix = lang.split("-")[0];
  const savedVoiceName = localStorage.getItem(lang === "de-DE" ? "system-german-voice" : "system-english-voice");
  const savedVoice = savedVoiceName ? voices.find((voice) => voice.name === savedVoiceName) : undefined;
  const preferredVoice = savedVoice ?? voices.find((voice) => new RegExp(`^${languagePrefix}([-_]|$)`, "i").test(voice.lang));
  const fallbackVoice = voices.find((voice) => /^en([-_]|$)/i.test(voice.lang)) ?? voices[0];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.voice = preferredVoice ?? fallbackVoice ?? null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: SpeechResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    utterance.onend = () => finish({ ok: true, voiceName: utterance.voice?.name });
    utterance.onerror = (event) => {
      const reason = event.error || "unknown error";
      finish({
        ok: false,
        message: reason === "not-allowed"
          ? "Audio was blocked by the browser. Click the audio button once and allow sound for this site."
          : `Audio failed (${reason}). ${preferredVoice ? "Check this tab's sound settings." : `No ${languagePrefix === "de" ? "German" : "English"} voice is installed on this device.`}`,
      });
    };

    // Waiting one task avoids Chrome treating a preceding utterance as interrupted.
    window.setTimeout(() => synth.speak(utterance), 0);
    window.setTimeout(() => finish({ ok: false, message: "Audio did not start. Check this tab's sound settings and installed system voices." }), 30000);
  });
}

export function speakGerman(text: string) {
  return speakText(text, "de-DE");
}
