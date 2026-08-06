"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Play, Volume2, X } from "lucide-react";
import { loadSystemVoices, speakText } from "@/lib/speech";
import { savePreference } from "@/lib/local-data";

type Language = "de-DE" | "en-US";

export function AudioQuickSettings() {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [germanVoice, setGermanVoice] = useState("");
  const [englishVoice, setEnglishVoice] = useState("");
  const [rate, setRate] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setGermanVoice(localStorage.getItem("system-german-voice") || "");
      setEnglishVoice(localStorage.getItem("system-english-voice") || "");
      setRate(Number(localStorage.getItem("playback-rate") || "1"));
    });
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("language-islands:audio-quick-settings", show);
    return () => window.removeEventListener("language-islands:audio-quick-settings", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadSystemVoices().then(setVoices);
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const germanVoices = useMemo(() => voices.filter((voice) => /^de([-_]|$)/i.test(voice.lang)), [voices]);
  const englishVoices = useMemo(() => voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang)), [voices]);

  function chooseVoice(language: Language, name: string) {
    if (language === "de-DE") setGermanVoice(name); else setEnglishVoice(name);
    savePreference(language === "de-DE" ? "system-german-voice" : "system-english-voice", name || null);
  }

  function chooseRate(value: number) {
    setRate(value);
    savePreference("playback-rate", String(value));
  }

  async function preview(language: Language) {
    await speakText(language === "de-DE" ? "Hallo! So klingt diese deutsche Stimme." : "Hello! This is how this English voice sounds.", language, rate);
  }

  return <div className="audio-quick" ref={panelRef}>
    <button className="icon-button" type="button" onClick={() => setOpen((value) => !value)} aria-label="Quick audio settings" aria-expanded={open}><Volume2 size={20} /></button>
    {open && <section className="audio-quick-panel" aria-label="Quick audio settings">
      <div className="audio-quick-head"><div><span className="eyebrow">System audio</span><strong>Voice &amp; speed</strong></div><button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close audio settings"><X size={18} /></button></div>
      <p>Voices installed and available on this device.</p>
      <VoiceRow label="German voice" language="de-DE" value={germanVoice} voices={germanVoices} onChange={chooseVoice} onPreview={preview} />
      <VoiceRow label="English voice" language="en-US" value={englishVoice} voices={englishVoices} onChange={chooseVoice} onPreview={preview} />
      <label className="audio-rate"><span><Gauge size={16} /> Speed</span><select value={rate} onChange={(event) => chooseRate(Number(event.target.value))}><option value={0.75}>0.75× Slow</option><option value={1}>1× Normal</option><option value={1.25}>1.25× Fast</option></select></label>
      {!voices.length && <small>No system voices were reported yet. Close and reopen this menu after Safari finishes loading them.</small>}
    </section>}
  </div>;
}

function VoiceRow({ label, language, value, voices, onChange, onPreview }: { label: string; language: Language; value: string; voices: SpeechSynthesisVoice[]; onChange: (language: Language, value: string) => void; onPreview: (language: Language) => void }) {
  return <div className="audio-voice-row"><label>{label}<select value={value} onChange={(event) => onChange(language, event.target.value)}><option value="">Automatic system choice</option>{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} · {voice.lang}</option>)}</select></label><button className="secondary-button" type="button" onClick={() => void onPreview(language)}><Play size={15} /> Sample</button></div>;
}
