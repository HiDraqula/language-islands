"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle, Plus, RefreshCw, Volume2 } from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Header } from "./header";
import { useToast } from "./ui-feedback";

type Phrase = { id: string; source: string; translation: string; status?: "idle" | "translating" | "error" };
const starter: Phrase[] = [
  { id: "starter-1", source: "Good morning, how are you?", translation: "Guten Morgen, wie geht es dir?" },
  { id: "starter-2", source: "Could you say that again, please?", translation: "Könnten Sie das bitte noch einmal sagen?" },
  { id: "starter-3", source: "", translation: "" },
];

export function IslandWorkspace({ islandId, islandTitle, islandDescription }: { islandId: string; islandTitle?: string; islandDescription?: string }) {
  const title = islandTitle || islandId.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
  const description = islandDescription || "English → German";
  const [phrases, setPhrases] = useState<Phrase[]>(starter);
  const [translateOnEnter, setTranslateOnEnter] = useState(true);
  const rowsRef = useRef<HTMLTextAreaElement[]>([]);
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(`phrases:${islandId}`);
    if (saved) { try { const parsed = JSON.parse(saved); queueMicrotask(() => setPhrases(parsed)); } catch { /* keep starter */ } }
    const preference = localStorage.getItem("translate-on-enter");
    if (preference !== null) queueMicrotask(() => setTranslateOnEnter(preference === "true"));
  }, [islandId]);

  function persist(next: Phrase[]) { setPhrases(next); localStorage.setItem(`phrases:${islandId}`, JSON.stringify(next)); }
  function update(index: number, source: string) { persist(phrases.map((row, i) => i === index ? { ...row, source, status: "idle" } : row)); }

  function speak(text: string) {
    if (!text) return toast("There is no translation to play yet.", "error");
    if (!("speechSynthesis" in window)) return toast("Audio is not supported by this browser.", "error");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "de-DE";
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("de"));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => toast("Audio could not play. Enable sound and install a German system voice.", "error");
    window.speechSynthesis.speak(utterance);
  }

  async function translate(index: number, autoPlay = false) {
    const text = phrases[index]?.source.trim();
    if (!text) return;
    const apiKey = sessionStorage.getItem("deepl-api-key");
    if (!apiKey) { persist(phrases.map((row, i) => i === index ? { ...row, status: "error", translation: "Add your DeepL key in Settings first." } : row)); toast("Add and test your DeepL key in Settings first.", "error"); return; }
    setPhrases((rows) => rows.map((row, i) => i === index ? { ...row, status: "translating", translation: "" } : row));
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetLang: "DE", apiKey }) });
      const data = await response.json();
      if (!response.ok || !data.translation) throw new Error(data.error || "DeepL did not return a translation.");
      const next = phrases.map((row, i) => i === index ? { ...row, translation: data.translation, status: "idle" as const } : row);
      persist(next);
      if (autoPlay) speak(data.translation);
    } catch (error) { persist(phrases.map((row, i) => i === index ? { ...row, status: "error", translation: "Translation failed — retry" } : row)); toast(error instanceof Error ? error.message : "Translation failed. Please retry.", "error"); }
  }

  function addRow(focus = false) {
    const next = [...phrases, { id: crypto.randomUUID(), source: "", translation: "", status: "idle" as const }];
    persist(next);
    if (focus) requestAnimationFrame(() => rowsRef.current[next.length - 1]?.focus());
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (translateOnEnter) await translate(index, true);
    if (index === phrases.length - 1) addRow(true); else rowsRef.current[index + 1]?.focus();
  }

  return (
    <main className="shell">
      <Header />
      <div className="page">
        <div className="workspace-toolbar">
          <div className="workspace-head">
            <Link href="/" className="back" aria-label="Back to all islands"><ArrowLeft size={20} /></Link>
            <div><h1 className="display">{title}</h1><p>{description}</p></div>
          </div>
          <label className="toggle-control"><span>Translate on Enter</span><input type="checkbox" checked={translateOnEnter} onChange={(event) => { setTranslateOnEnter(event.target.checked); localStorage.setItem("translate-on-enter", String(event.target.checked)); }} /><span className="toggle-track" /></label>
        </div>
        <section className="phrase-table" aria-label={`${title} phrases`}>
          <div className="phrase-header"><div>#</div><div>English</div><div>German · DeepL</div><div>Audio</div></div>
          {phrases.map((phrase, index) => (
            <div className="phrase-row" key={phrase.id}>
              <div className="row-number">{index + 1}</div>
              <div><textarea ref={(node) => { if (node) rowsRef.current[index] = node; }} aria-label={`English phrase ${index + 1}`} rows={2} value={phrase.source} placeholder="Type a phrase, then press Enter…" onChange={(event) => update(index, event.target.value)} onKeyDown={(event) => handleKeyDown(event, index)} /></div>
              <div className={`translation ${phrase.status === "error" ? "translation-error" : ""}`}>
                {phrase.status === "translating" ? <span className="translation-state"><LoaderCircle className="spin" size={16} /> Translating…</span> : phrase.translation || "Translation will appear here"}
                {phrase.source && phrase.status !== "translating" && <button className="retry" type="button" onClick={() => translate(index)} aria-label={`Translate phrase ${index + 1}`}><RefreshCw size={14} /> {phrase.status === "error" ? "Retry" : "Translate"}</button>}
              </div>
              <div><button className="speak" aria-label={`Play phrase ${index + 1}`} type="button" disabled={!phrase.translation || phrase.status === "error"} onClick={() => speak(phrase.translation)}><Volume2 size={20} /></button></div>
            </div>
          ))}
          <button className="add-row" type="button" onClick={() => addRow(true)}><Plus size={16} /> Add another phrase</button>
        </section>
      </div>
    </main>
  );
}
