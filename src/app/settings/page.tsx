"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck, Trash2, Volume2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useToast } from "@/components/ui-feedback";
import { playText, AudioEngine } from "@/lib/audio";

type Island = { id: string; title: string; description?: string };

export default function SettingsPage() {
  const [deeplKey, setDeeplKey] = useState("");
  const [deeplStatus, setDeeplStatus] = useState<"idle" | "testing" | "connected" | "invalid">("idle");
  const [engine, setEngine] = useState<AudioEngine>("system");
  const [elevenKey, setElevenKey] = useState("");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [elevenStatus, setElevenStatus] = useState<"idle" | "testing" | "connected" | "invalid">("idle");
  const [azureKey, setAzureKey] = useState("");
  const [azureRegion, setAzureRegion] = useState("westeurope");
  const [azureGermanVoice, setAzureGermanVoice] = useState("de-DE-KatjaNeural");
  const [azureEnglishVoice, setAzureEnglishVoice] = useState("en-US-JennyNeural");
  const [azureStatus, setAzureStatus] = useState<"idle" | "testing" | "connected" | "invalid">("idle");
  const [islands, setIslands] = useState<Island[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Island | null>(null);
  const toast = useToast();

  useEffect(() => {
    const dk = sessionStorage.getItem("deepl-api-key");
    const ek = sessionStorage.getItem("elevenlabs-api-key");
    const ak = sessionStorage.getItem("azure-speech-api-key");
    queueMicrotask(() => {
      if (dk) { setDeeplKey(dk); setDeeplStatus("connected"); }
      if (ek) { setElevenKey(ek); setElevenStatus("connected"); }
      if (ak) { setAzureKey(ak); setAzureStatus("connected"); }
      setEngine((localStorage.getItem("tts-engine") || "system") as AudioEngine);
      setVoiceId(localStorage.getItem("elevenlabs-german-voice") || "21m00Tcm4TlvDq8ikWAM");
      setAzureRegion(localStorage.getItem("azure-speech-region") || "westeurope");
      setAzureGermanVoice(localStorage.getItem("azure-german-voice") || "de-DE-KatjaNeural");
      setAzureEnglishVoice(localStorage.getItem("azure-english-voice") || "en-US-JennyNeural");
      try { setIslands(JSON.parse(localStorage.getItem("language-islands") || "[]")); } catch { /* no saved islands */ }
    });
  }, []);

  async function testDeepL(event: FormEvent) {
    event.preventDefault();
    if (!deeplKey.trim()) return;
    setDeeplStatus("testing");
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Hello", targetLang: "DE", apiKey: deeplKey.trim() }) });
      if (!response.ok) throw new Error();
      sessionStorage.setItem("deepl-api-key", deeplKey.trim()); setDeeplStatus("connected"); toast("DeepL key connected for this browser session.", "success");
    } catch { setDeeplStatus("invalid"); toast("Could not connect to DeepL. Check the key and try again.", "error"); }
  }

  async function testElevenLabs(event: FormEvent) {
    event.preventDefault();
    if (!elevenKey.trim() || !voiceId.trim()) return;
    setElevenStatus("testing");
    sessionStorage.setItem("elevenlabs-api-key", elevenKey.trim());
    localStorage.setItem("elevenlabs-german-voice", voiceId.trim());
    localStorage.setItem("tts-engine", "elevenlabs"); setEngine("elevenlabs");
    const result = await playText("Guten Tag. Die Aussprache ist bereit.", "de-DE");
    if (result.ok) { setElevenStatus("connected"); toast("ElevenLabs audio is connected.", "success"); }
    else { sessionStorage.removeItem("elevenlabs-api-key"); setElevenStatus("invalid"); toast(result.message, "error"); }
  }

  async function testAzure(event: FormEvent) {
    event.preventDefault();
    if (!azureKey.trim() || !azureRegion.trim() || !azureGermanVoice.trim()) return;
    setAzureStatus("testing");
    sessionStorage.setItem("azure-speech-api-key", azureKey.trim());
    localStorage.setItem("azure-speech-region", azureRegion.trim().toLowerCase());
    localStorage.setItem("azure-german-voice", azureGermanVoice.trim());
    localStorage.setItem("azure-english-voice", azureEnglishVoice.trim());
    localStorage.setItem("tts-engine", "azure"); setEngine("azure");
    const result = await playText("Guten Tag. Azure Speech ist bereit.", "de-DE");
    if (result.ok) { setAzureStatus("connected"); toast("Azure Speech audio is connected.", "success"); }
    else { sessionStorage.removeItem("azure-speech-api-key"); setAzureStatus("invalid"); toast(result.message, "error"); }
  }

  function chooseEngine(value: AudioEngine) { setEngine(value); localStorage.setItem("tts-engine", value); toast(value === "system" ? "Using the device system voice." : `Using ${value === "azure" ? "Azure Speech" : "ElevenLabs"} cloud audio.`, "info"); }
  function removeDeepL() { sessionStorage.removeItem("deepl-api-key"); setDeeplKey(""); setDeeplStatus("idle"); toast("DeepL key removed.", "info"); }
  function removeEleven() { sessionStorage.removeItem("elevenlabs-api-key"); setElevenKey(""); setElevenStatus("idle"); if (engine === "elevenlabs") chooseEngine("system"); toast("ElevenLabs key removed.", "info"); }
  function removeAzure() { sessionStorage.removeItem("azure-speech-api-key"); setAzureKey(""); setAzureStatus("idle"); if (engine === "azure") chooseEngine("system"); toast("Azure Speech key removed.", "info"); }
  function deleteIsland(island: Island) { const next = islands.filter((item) => item.id !== island.id); localStorage.setItem("language-islands", JSON.stringify(next)); localStorage.removeItem(`phrases:${island.id}`); setIslands(next); setDeleteTarget(null); toast(`Deleted ${island.title}.`, "success"); }

  return <main className="shell"><Header /><div className="page settings-page">
    <div className="workspace-head"><Link href="/" className="back" aria-label="Back"><ArrowLeft size={20} /></Link><div><h1 className="display">Settings</h1><p>Translation, pronunciation and data preferences</p></div></div>
    <section className="settings-card"><div className="settings-icon"><KeyRound size={21} /></div><form className="settings-content" onSubmit={testDeepL}><h2>DeepL translation</h2><p>Your personal key stays in this browser session and is sent through the website only when you translate.</p><label>DeepL authentication key<input type="password" autoComplete="off" value={deeplKey} onChange={(e) => { setDeeplKey(e.target.value); setDeeplStatus("idle"); }} placeholder="Enter your DeepL API key" /></label><div className="settings-actions"><button className="primary-button" disabled={!deeplKey.trim() || deeplStatus === "testing"} type="submit">{deeplStatus === "testing" ? "Testing…" : "Test & save key"}</button>{deeplKey && <button className="secondary-button danger" type="button" onClick={removeDeepL}><Trash2 size={16} /> Remove</button>}</div>{deeplStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> Connected to DeepL</div>}<div className="security-note"><ShieldCheck size={17} /> Keys clear when this browser session ends.</div></form></section>

    <section className="settings-card"><div className="settings-icon"><Volume2 size={21} /></div><div className="settings-content"><h2>Text-to-speech</h2><p>Use a voice installed on your device, ElevenLabs, or Microsoft Azure Speech.</p><div className="engine-options"><label><input type="radio" name="tts-engine" checked={engine === "system"} onChange={() => chooseEngine("system")} /><span><strong>System voice</strong><small>Free, fast and works offline when a matching voice is installed.</small></span></label><label><input type="radio" name="tts-engine" checked={engine === "elevenlabs"} onChange={() => chooseEngine("elevenlabs")} /><span><strong>ElevenLabs</strong><small>Cloud-generated multilingual audio using your own API allowance.</small></span></label><label><input type="radio" name="tts-engine" checked={engine === "azure"} onChange={() => chooseEngine("azure")} /><span><strong>Microsoft Azure Speech</strong><small>Reliable neural speech using your Azure Speech key and region.</small></span></label></div><form onSubmit={testElevenLabs} className="nested-settings"><h3>ElevenLabs</h3><label>ElevenLabs API key<input type="password" autoComplete="off" value={elevenKey} onChange={(e) => { setElevenKey(e.target.value); setElevenStatus("idle"); }} placeholder="Enter your ElevenLabs API key" /></label><label>German voice ID<input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="ElevenLabs voice ID" /></label><div className="settings-actions"><button className="primary-button" disabled={!elevenKey.trim() || !voiceId.trim() || elevenStatus === "testing"} type="submit">{elevenStatus === "testing" ? "Generating test…" : "Test & save ElevenLabs"}</button>{elevenKey && <button className="secondary-button danger" type="button" onClick={removeEleven}><Trash2 size={16} /> Remove</button>}</div>{elevenStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> ElevenLabs is ready</div>}</form><form onSubmit={testAzure} className="nested-settings"><h3>Microsoft Azure Speech</h3><label>Speech resource key<input type="password" autoComplete="off" value={azureKey} onChange={(e) => { setAzureKey(e.target.value); setAzureStatus("idle"); }} placeholder="Enter Azure Speech key 1 or key 2" /></label><label>Azure region<input value={azureRegion} onChange={(e) => setAzureRegion(e.target.value)} placeholder="For example: westeurope" /></label><label>German voice<input value={azureGermanVoice} onChange={(e) => setAzureGermanVoice(e.target.value)} placeholder="de-DE-KatjaNeural" /></label><label>English voice<input value={azureEnglishVoice} onChange={(e) => setAzureEnglishVoice(e.target.value)} placeholder="en-US-JennyNeural" /></label><div className="settings-actions"><button className="primary-button" disabled={!azureKey.trim() || !azureRegion.trim() || !azureGermanVoice.trim() || azureStatus === "testing"} type="submit">{azureStatus === "testing" ? "Generating test…" : "Test & save Azure"}</button>{azureKey && <button className="secondary-button danger" type="button" onClick={removeAzure}><Trash2 size={16} /> Remove</button>}</div>{azureStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> Azure Speech is ready</div>}{azureStatus === "invalid" && <div className="connection error">Azure could not connect. Check the resource key, region and voice.</div>}</form></div></section>

    <section className="settings-card danger-zone"><div className="settings-icon"><Trash2 size={21} /></div><div className="settings-content"><h2>Delete islands</h2><p>This is the protected place for removing complete islands and their phrases from this browser.</p>{islands.length ? <div className="delete-list">{islands.map((island) => <div key={island.id}><span>{island.title}</span><button className="secondary-button danger" type="button" onClick={() => setDeleteTarget(island)}><Trash2 size={15} /> Delete</button></div>)}</div> : <p className="empty-note">No locally saved islands to delete.</p>}</div></section>
  </div>{deleteTarget && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}><section className="modal-card confirm-card" role="dialog" aria-modal="true" aria-labelledby="settings-delete-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={19} /></button><span className="eyebrow danger">Permanent action</span><h2 className="display" id="settings-delete-title">Delete “{deleteTarget.title}”?</h2><p>All phrases in this island will be removed from this browser. This cannot be undone.</p><div className="settings-actions"><button className="primary-button destructive-button" type="button" onClick={() => deleteIsland(deleteTarget)}><Trash2 size={16} /> Delete island</button><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></section></div>}</main>;
}
