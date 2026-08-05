"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useToast } from "@/components/ui-feedback";

export default function SettingsPage() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "connected" | "invalid">("idle");
  const toast = useToast();

  useEffect(() => {
    const saved = sessionStorage.getItem("deepl-api-key");
    if (saved) queueMicrotask(() => { setKey(saved); setStatus("connected"); });
  }, []);

  async function testAndSave(event: FormEvent) {
    event.preventDefault();
    if (!key.trim()) return;
    setStatus("testing");
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Hello", targetLang: "DE", apiKey: key.trim() }) });
      if (!response.ok) throw new Error();
      sessionStorage.setItem("deepl-api-key", key.trim());
      setStatus("connected");
      toast("DeepL key connected for this browser session.", "success");
    } catch { setStatus("invalid"); toast("Could not connect to DeepL. Check the key and try again.", "error"); }
  }

  function removeKey() {
    sessionStorage.removeItem("deepl-api-key"); setKey(""); setStatus("idle"); toast("DeepL key removed.", "info");
  }

  return (
    <main className="shell">
      <Header />
      <div className="page settings-page">
        <div className="workspace-head">
          <Link href="/" className="back" aria-label="Back"><ArrowLeft size={20} /></Link>
          <div><h1 className="display">Settings</h1><p>Translation, audio and account preferences</p></div>
        </div>
        <section className="settings-card">
          <div className="settings-icon"><KeyRound size={21} /></div>
          <form className="settings-content" onSubmit={testAndSave}>
            <h2>DeepL API</h2>
            <p>Your personal key stays in this browser session and is sent only to the server when you translate.</p>
            <label>DeepL authentication key<input type="password" autoComplete="off" value={key} onChange={(event) => { setKey(event.target.value); setStatus("idle"); }} placeholder="Enter your DeepL API key" /></label>
            <div className="settings-actions">
              <button className="primary-button" disabled={!key.trim() || status === "testing"} type="submit">{status === "testing" ? "Testing…" : "Test & save key"}</button>
              {key && <button className="secondary-button danger" type="button" onClick={removeKey}><Trash2 size={16} /> Remove</button>}
            </div>
            {status === "connected" && <div className="connection success"><CheckCircle2 size={17} /> Connected to DeepL</div>}
            {status === "invalid" && <div className="connection error">Could not connect. Check the key and try again.</div>}
            <div className="security-note"><ShieldCheck size={17} /> The key is never committed to GitHub and clears when this browser session ends.</div>
          </form>
        </section>
      </div>
    </main>
  );
}
