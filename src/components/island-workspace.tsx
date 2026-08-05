"use client";

import Link from "next/link";
import { AlignJustify, ArrowLeft, LayoutList, LoaderCircle, Pause, Pencil, Play, Plus, RefreshCw, Rows3, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Header } from "./header";
import { useToast } from "./ui-feedback";
import { playText } from "@/lib/audio";
import { recordUsage } from "@/lib/usage";

type Phrase = { id: string; source: string; translation: string; status?: "idle" | "translating" | "error" };
type ListenMode = "german" | "english" | "both";
type Density = "compact" | "comfortable" | "relaxed";
const starter: Phrase[] = [
  { id: "starter-1", source: "Good morning, how are you?", translation: "Guten Morgen, wie geht es dir?" },
  { id: "starter-2", source: "Could you say that again, please?", translation: "Könnten Sie das bitte noch einmal sagen?" },
  { id: "starter-3", source: "", translation: "" },
];

export function IslandWorkspace({ islandId, islandTitle, islandDescription }: { islandId: string; islandTitle?: string; islandDescription?: string }) {
  const fallbackTitle = islandTitle || islandId.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
  const [title, setTitle] = useState(fallbackTitle);
  const [description, setDescription] = useState(islandDescription || "English → German");
  const [phrases, setPhrases] = useState<Phrase[]>(starter);
  const [translateOnEnter, setTranslateOnEnter] = useState(true);
  const [listenMode, setListenMode] = useState<ListenMode>("both");
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [density, setDensity] = useState<Density>("relaxed");
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(fallbackTitle);
  const [draftDescription, setDraftDescription] = useState(islandDescription || "English → German");
  const playbackRun = useRef(0);
  const rowsRef = useRef<HTMLTextAreaElement[]>([]);
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(`phrases:${islandId}`);
    if (saved) { try { const parsed = JSON.parse(saved); queueMicrotask(() => setPhrases(parsed)); } catch { /* keep starter */ } }
    const preference = localStorage.getItem("translate-on-enter");
    if (preference !== null) queueMicrotask(() => setTranslateOnEnter(preference === "true"));
    const savedDensity = localStorage.getItem("island-density") as Density | null;
    if (savedDensity) queueMicrotask(() => setDensity(savedDensity));
  }, [islandId]);

  function persist(next: Phrase[]) { setPhrases(next); localStorage.setItem(`phrases:${islandId}`, JSON.stringify(next)); }
  function persistUpdate(updateRows: (rows: Phrase[]) => Phrase[]) { setPhrases((rows) => { const next = updateRows(rows); localStorage.setItem(`phrases:${islandId}`, JSON.stringify(next)); return next; }); }
  function update(index: number, source: string) { persist(phrases.map((row, i) => i === index ? { ...row, source, status: "idle" } : row)); }
  const playable = phrases.filter((phrase) => phrase.source.trim() || phrase.translation.trim());

  async function speak(text: string) {
    if (!text) return toast("There is no translation to play yet.", "error");
    setPlayerVisible(true);
    const result = await playText(text, "de-DE");
    if (!result.ok) toast(result.message, "error");
  }

  function stopPlayback() { playbackRun.current += 1; window.speechSynthesis?.cancel(); setIsPlayingAll(false); }

  async function playAll() {
    if (!playable.length) return toast("Add at least one phrase before starting playback.", "error");
    const run = playbackRun.current + 1;
    playbackRun.current = run; setIsPlayingAll(true); setPlayerVisible(true);
    for (let rowIndex = playbackIndex; rowIndex < playable.length; rowIndex += 1) {
      const phrase = playable[rowIndex]; setPlaybackIndex(rowIndex);
      const items = listenMode === "both" ? [{ text: phrase.source, lang: "en-US" as const }, { text: phrase.translation, lang: "de-DE" as const }] : listenMode === "english" ? [{ text: phrase.source, lang: "en-US" as const }] : [{ text: phrase.translation, lang: "de-DE" as const }];
      for (const item of items) {
        if (playbackRun.current !== run) return;
        if (!item.text.trim()) continue;
        const result = await playText(item.text, item.lang);
        if (playbackRun.current !== run) return;
        if (!result.ok) { setIsPlayingAll(false); toast(result.message, "error"); return; }
      }
    }
    if (playbackRun.current === run) { setIsPlayingAll(false); setPlaybackIndex(0); toast("Finished playing this island.", "success"); }
  }

  async function translate(index: number, autoPlay = false) {
    const text = phrases[index]?.source.trim();
    if (!text) return;
    const apiKey = sessionStorage.getItem("deepl-api-key");
    if (!apiKey) { persistUpdate((rows) => rows.map((row, i) => i === index ? { ...row, status: "error", translation: "Add your DeepL key in Settings first." } : row)); toast("Add and test your DeepL key in Settings first.", "error"); return; }
    persistUpdate((rows) => rows.map((row, i) => i === index ? { ...row, status: "translating", translation: "" } : row));
    try {
      recordUsage("translation", text.length);
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, targetLang: "DE", apiKey }) });
      const data = await response.json();
      if (!response.ok || !data.translation) throw new Error(data.error || "DeepL did not return a translation.");
      persistUpdate((rows) => rows.map((row, i) => i === index ? { ...row, translation: data.translation, status: "idle" as const } : row));
      if (autoPlay) void speak(data.translation);
    } catch (error) { persistUpdate((rows) => rows.map((row, i) => i === index ? { ...row, status: "error", translation: "Translation failed — retry" } : row)); toast(error instanceof Error ? error.message : "Translation failed. Please retry.", "error"); }
  }

  function addRow(focus = false) { let nextIndex = 0; persistUpdate((rows) => { nextIndex = rows.length; return [...rows, { id: crypto.randomUUID(), source: "", translation: "", status: "idle" }]; }); if (focus) requestAnimationFrame(() => rowsRef.current[nextIndex]?.focus()); }
  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) { if (event.key !== "Enter" || event.shiftKey) return; event.preventDefault(); if (translateOnEnter) await translate(index, true); if (index === phrases.length - 1) addRow(true); else rowsRef.current[index + 1]?.focus(); }
  function chooseDensity(next: Density) { setDensity(next); localStorage.setItem("island-density", next); }
  function saveIslandDetails() {
    const cleanTitle = draftTitle.trim();
    if (!cleanTitle) return toast("Island name cannot be empty.", "error");
    try {
      const islands = JSON.parse(localStorage.getItem("language-islands") || "[]");
      localStorage.setItem("language-islands", JSON.stringify(islands.map((island: { id: string }) => island.id === islandId ? { ...island, title: cleanTitle, description: draftDescription.trim() } : island)));
      setTitle(cleanTitle); setDescription(draftDescription.trim()); setEditOpen(false); toast("Island details updated.", "success");
    } catch { toast("Island details could not be saved.", "error"); }
  }

  return <main className="shell"><Header /><div className="page">
    <div className="workspace-toolbar"><div className="workspace-head"><Link href="/" className="back" aria-label="Back to all islands"><ArrowLeft size={20} /></Link><div><div className="title-with-action"><h1 className="display">{title}</h1><button className="icon-button" type="button" onClick={() => { setDraftTitle(title); setDraftDescription(description); setEditOpen(true); }} aria-label="Edit island name and description" title="Edit island"><Pencil size={16} /></button></div><p>{description}</p></div></div>
      <div className="workspace-actions"><div className="listen-control"><select aria-label="Columns to play" value={listenMode} onChange={(event) => setListenMode(event.target.value as ListenMode)} disabled={isPlayingAll}><option value="both">English → German</option><option value="german">German only</option><option value="english">English only</option></select><button className="secondary-button" type="button" onClick={isPlayingAll ? stopPlayback : playAll}>{isPlayingAll ? <Pause size={16} /> : <Play size={16} />} {isPlayingAll ? "Pause" : "Play all"}</button></div>
        <label className="toggle-control"><span>Translate on Enter</span><input type="checkbox" checked={translateOnEnter} onChange={(event) => { setTranslateOnEnter(event.target.checked); localStorage.setItem("translate-on-enter", String(event.target.checked)); }} /><span className="toggle-track" /></label>
        <div className="density-control" role="group" aria-label="Row spacing"><button className={density === "compact" ? "active" : ""} type="button" onClick={() => chooseDensity("compact")} title="Compact view" aria-label="Compact view"><AlignJustify size={17} /></button><button className={density === "comfortable" ? "active" : ""} type="button" onClick={() => chooseDensity("comfortable")} title="Comfortable view" aria-label="Comfortable view"><Rows3 size={17} /></button><button className={density === "relaxed" ? "active" : ""} type="button" onClick={() => chooseDensity("relaxed")} title="Spaced view" aria-label="Spaced view"><LayoutList size={17} /></button></div>
      </div></div>
    <section className={`phrase-table density-${density}`} aria-label={`${title} phrases`}><div className="phrase-header"><div>#</div><div>English</div><div>German · DeepL</div><div>Audio</div></div>{phrases.map((phrase, index) => <div className="phrase-row" key={phrase.id}><div className="row-number">{index + 1}</div><div><textarea ref={(node) => { if (node) rowsRef.current[index] = node; }} aria-label={`English phrase ${index + 1}`} rows={density === "compact" ? 1 : 2} value={phrase.source} placeholder="Type a phrase, then press Enter…" onChange={(event) => update(index, event.target.value)} onKeyDown={(event) => handleKeyDown(event, index)} /></div><div className={`translation ${phrase.status === "error" ? "translation-error" : ""}`}>{phrase.status === "translating" ? <span className="translation-state"><LoaderCircle className="spin" size={16} /> Translating…</span> : phrase.translation || "Translation will appear here"}{phrase.source && phrase.status !== "translating" && <button className="retry" type="button" onClick={() => translate(index)} aria-label={`Translate phrase ${index + 1}`}><RefreshCw size={14} /> {phrase.status === "error" ? "Retry" : "Translate"}</button>}</div><div><button className="speak" aria-label={`Play phrase ${index + 1}`} type="button" disabled={!phrase.translation || phrase.status === "error"} onClick={() => { const playableIndex = playable.findIndex((item) => item.id === phrase.id); setPlaybackIndex(Math.max(0, playableIndex)); void speak(phrase.translation); }}><Volume2 size={20} /></button></div></div>)}<button className="add-row" type="button" onClick={() => addRow(true)}><Plus size={16} /> Add another phrase</button></section>
  </div>
  {playerVisible && <aside className="playback-dock" aria-label="Audio player"><button type="button" onClick={() => { stopPlayback(); setPlaybackIndex(Math.max(0, playbackIndex - 1)); }} aria-label="Previous row"><SkipBack size={17} /></button><button className="player-main" type="button" onClick={isPlayingAll ? stopPlayback : playAll} aria-label={isPlayingAll ? "Pause playback" : "Resume playback"}>{isPlayingAll ? <Pause size={19} /> : <Play size={19} />}</button><div className="player-progress"><div><strong>{isPlayingAll ? "Playing island" : "Playback ready"}</strong><span>Row {Math.min(playbackIndex + 1, Math.max(playable.length, 1))} of {playable.length}</span></div><input type="range" min="0" max={Math.max(0, playable.length - 1)} value={Math.min(playbackIndex, Math.max(0, playable.length - 1))} onChange={(event) => { stopPlayback(); setPlaybackIndex(Number(event.target.value)); }} aria-label="Playback row" /></div><button type="button" onClick={() => { stopPlayback(); setPlaybackIndex(Math.min(playbackIndex + 1, Math.max(0, playable.length - 1))); }} aria-label="Next row"><SkipForward size={17} /></button><button type="button" onClick={() => { stopPlayback(); setPlaybackIndex(0); setPlayerVisible(false); }} aria-label="Close player"><X size={17} /></button></aside>}
  {editOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-island-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setEditOpen(false)} aria-label="Close"><X size={19} /></button><span className="eyebrow">Island details</span><h2 className="display" id="edit-island-title">Edit island</h2><label>Island name<input autoFocus value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label><label>Description<textarea rows={3} value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} /></label><button className="primary-button" type="button" onClick={saveIslandDetails}>Save changes</button></section></div>}
  </main>;
}
