"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Volume2 } from "lucide-react";
import { useState } from "react";
import { Header } from "./header";

type Phrase = { source: string; translation: string };

const names: Record<string, { title: string; description: string }> = {
  "daily-conversations": { title: "Daily conversations", description: "Everyday English → German" },
  "grocery-shopping": { title: "Grocery shopping", description: "At the market and supermarket" },
  "work-and-study": { title: "Work & study", description: "University and professional life" },
};

const starter: Phrase[] = [
  { source: "Good morning, how are you?", translation: "Guten Morgen, wie geht es dir?" },
  { source: "Could you say that again, please?", translation: "Könnten Sie das bitte noch einmal sagen?" },
  { source: "", translation: "" },
];

export function IslandWorkspace({ islandId }: { islandId: string }) {
  const [phrases, setPhrases] = useState(starter);
  const island = names[islandId] ?? { title: "My island", description: "English → German" };

  function update(index: number, source: string) {
    setPhrases((rows) => rows.map((row, i) => i === index ? { ...row, source, translation: source ? "Ready for DeepL connection…" : "" } : row));
  }

  function speak(text: string) {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("de"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="shell">
      <Header />
      <div className="page">
        <div className="workspace-head">
          <Link href="/" className="back" aria-label="Back to all islands"><ArrowLeft size={20} /></Link>
          <div><h1 className="display">{island.title}</h1><p>{island.description}</p></div>
        </div>
        <section className="phrase-table" aria-label={`${island.title} phrases`}>
          <div className="phrase-header"><div>#</div><div>English</div><div>German · DeepL</div><div>Audio</div></div>
          {phrases.map((phrase, index) => (
            <div className="phrase-row" key={index}>
              <div className="row-number">{index + 1}</div>
              <div><textarea aria-label={`English phrase ${index + 1}`} rows={2} value={phrase.source} placeholder="Type a phrase, then press Enter…" onChange={(event) => update(index, event.target.value)} /></div>
              <div className="translation">{phrase.translation || "Translation will appear here"}</div>
              <div><button className="speak" aria-label={`Play phrase ${index + 1}`} type="button" onClick={() => speak(phrase.translation)}><Volume2 size={20} /></button></div>
            </div>
          ))}
          <button className="add-row" type="button" onClick={() => setPhrases((rows) => [...rows, { source: "", translation: "" }])}><Plus size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Add another phrase</button>
        </section>
      </div>
    </main>
  );
}
