"use client";

import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Cloud, Copy, ExternalLink, HelpCircle, KeyRound, LoaderCircle, Play, RefreshCw, ShieldCheck, Trash2, Volume2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui-feedback";
import { playText, AudioEngine } from "@/lib/audio";
import { readUsage, recordUsage, resetUsage, UsageStats } from "@/lib/usage";
import { PREFERENCES_APPLIED, readSyncedPreferences, removeIslandData, saveIslands, savePreference } from "@/lib/local-data";
import { downloadApiCredentials, uploadApiCredentials } from "@/lib/secret-sync";

type Island = { id: string; title: string; description?: string };
type ProviderGuide = "elevenlabs" | "azure";
type AzureVoice = {
  ShortName: string;
  DisplayName: string;
  LocalName?: string;
  Locale: string;
  Gender: string;
  VoiceType?: string;
  StyleList?: string[];
};

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
  const [azureVoices, setAzureVoices] = useState<AzureVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [islands, setIslands] = useState<Island[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Island | null>(null);
  const [providerGuide, setProviderGuide] = useState<ProviderGuide | null>(null);
  const [usage, setUsage] = useState<UsageStats>(() => readUsage());
  const [credentialSyncing, setCredentialSyncing] = useState<"upload" | "download" | null>(null);
  const { user, syncing, lastSyncedAt, syncNow } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const refreshPreferences = () => {
      setEngine((localStorage.getItem("tts-engine") || "system") as AudioEngine);
      setVoiceId(localStorage.getItem("elevenlabs-german-voice") || "21m00Tcm4TlvDq8ikWAM");
      setAzureRegion(localStorage.getItem("azure-speech-region") || "westeurope");
      setAzureGermanVoice(localStorage.getItem("azure-german-voice") || "de-DE-KatjaNeural");
      setAzureEnglishVoice(localStorage.getItem("azure-english-voice") || "en-US-JennyNeural");
    };
    const dk = sessionStorage.getItem("deepl-api-key");
    const ek = sessionStorage.getItem("elevenlabs-api-key");
    const ak = sessionStorage.getItem("azure-speech-api-key");
    queueMicrotask(() => {
      if (dk) { setDeeplKey(dk); setDeeplStatus("connected"); }
      if (ek) { setElevenKey(ek); setElevenStatus("connected"); }
      if (ak) { setAzureKey(ak); setAzureStatus("connected"); }
      refreshPreferences();
      try { setIslands(JSON.parse(localStorage.getItem("language-islands") || "[]")); } catch { /* no saved islands */ }
    });
    window.addEventListener(PREFERENCES_APPLIED, refreshPreferences);
    return () => window.removeEventListener(PREFERENCES_APPLIED, refreshPreferences);
  }, []);

  useEffect(() => {
    const refresh = () => setUsage(readUsage());
    window.addEventListener("language-islands:usage-updated", refresh);
    return () => window.removeEventListener("language-islands:usage-updated", refresh);
  }, []);

  async function testDeepL(event: FormEvent) {
    event.preventDefault();
    if (!deeplKey.trim()) return;
    setDeeplStatus("testing");
    try {
      recordUsage("translation", 5);
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
    savePreference("elevenlabs-german-voice", voiceId.trim());
    savePreference("tts-engine", "elevenlabs"); setEngine("elevenlabs");
    const result = await playText("Guten Tag. Die Aussprache ist bereit.", "de-DE");
    if (result.ok) { setElevenStatus("connected"); toast("ElevenLabs audio is connected.", "success"); }
    else { sessionStorage.removeItem("elevenlabs-api-key"); setElevenStatus("invalid"); toast(result.message, "error"); }
  }

  async function testAzure(event: FormEvent) {
    event.preventDefault();
    if (!azureKey.trim() || !azureRegion.trim() || !azureGermanVoice.trim()) return;
    setAzureStatus("testing");
    sessionStorage.setItem("azure-speech-api-key", azureKey.trim());
    savePreference("azure-speech-region", azureRegion.trim().toLowerCase());
    savePreference("azure-german-voice", azureGermanVoice.trim());
    savePreference("azure-english-voice", azureEnglishVoice.trim());
    savePreference("tts-engine", "azure"); setEngine("azure");
    const result = await playText("Guten Tag. Azure Speech ist bereit.", "de-DE");
    if (result.ok) { setAzureStatus("connected"); toast("Azure Speech audio is connected.", "success"); }
    else { sessionStorage.removeItem("azure-speech-api-key"); setAzureStatus("invalid"); toast(result.message, "error"); }
  }

  async function loadAzureVoices() {
    if (!azureKey.trim() || !azureRegion.trim()) return toast("Enter your Azure Speech key and region first.", "error");
    setVoicesLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-azure-voices", apiKey: azureKey.trim(), region: azureRegion.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.voices)) throw new Error(data.error || "Azure did not return a voice list.");
      const voices = (data.voices as AzureVoice[]).sort((a, b) => a.Locale.localeCompare(b.Locale) || a.DisplayName.localeCompare(b.DisplayName));
      setAzureVoices(voices);
      toast(`Loaded ${voices.length} Azure voices.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Azure voices could not be loaded.", "error");
    } finally {
      setVoicesLoading(false);
    }
  }

  async function previewAzureVoice(voice: string, lang: "de-DE" | "en-US") {
    if (!azureKey.trim() || !azureRegion.trim()) return toast("Enter your Azure Speech key and region first.", "error");
    sessionStorage.setItem("azure-speech-api-key", azureKey.trim());
    savePreference("azure-speech-region", azureRegion.trim().toLowerCase());
    savePreference(lang === "de-DE" ? "azure-german-voice" : "azure-english-voice", voice);
    savePreference("tts-engine", "azure");
    setEngine("azure");
    setPreviewingVoice(voice);
    const result = await playText(lang === "de-DE" ? "Hallo! So klingt diese deutsche Stimme." : "Hello! This is how this English voice sounds.", lang);
    setPreviewingVoice(null);
    if (!result.ok) toast(result.message, "error");
  }

  const germanVoices = azureVoices.filter((voice) => voice.Locale.toLowerCase().startsWith("de-"));
  const englishVoices = azureVoices.filter((voice) => voice.Locale.toLowerCase().startsWith("en-"));
  const voiceLabel = (voice: AzureVoice) => `${voice.LocalName || voice.DisplayName} · ${voice.Locale} · ${voice.Gender}`;

  function chooseEngine(value: AudioEngine) { setEngine(value); savePreference("tts-engine", value); toast(value === "system" ? "Using the device system voice." : `Using ${value === "azure" ? "Azure Speech" : "ElevenLabs"} cloud audio.`, "info"); }
  function removeDeepL() { sessionStorage.removeItem("deepl-api-key"); setDeeplKey(""); setDeeplStatus("idle"); toast("DeepL key removed.", "info"); }
  function removeEleven() { sessionStorage.removeItem("elevenlabs-api-key"); setElevenKey(""); setElevenStatus("idle"); if (engine === "elevenlabs") chooseEngine("system"); toast("ElevenLabs key removed.", "info"); }
  function removeAzure() { sessionStorage.removeItem("azure-speech-api-key"); setAzureKey(""); setAzureStatus("idle"); if (engine === "azure") chooseEngine("system"); toast("Azure Speech key removed.", "info"); }
  function deleteIsland(island: Island) { const next = islands.filter((item) => item.id !== island.id); saveIslands(next); removeIslandData(island.id); setIslands(next); setDeleteTarget(null); toast(`Deleted ${island.title}.`, "success"); }

  async function copyConfig() {
    const config = { version: 1, preferences: readSyncedPreferences(), note: "API credentials are intentionally excluded." };
    try { await navigator.clipboard.writeText(JSON.stringify(config, null, 2)); toast("Settings copied without API credentials.", "success"); }
    catch { toast("The browser could not copy the settings.", "error"); }
  }

  async function syncCredentials() {
    if (!user) return toast("Sign in with Google before syncing API credentials.", "error");
    if (!deeplKey.trim() && !elevenKey.trim() && !azureKey.trim()) return toast("Enter at least one API credential before syncing.", "error");
    setCredentialSyncing("upload");
    try {
      await uploadApiCredentials(user, {
        deeplKey: deeplKey.trim(),
        elevenLabsKey: elevenKey.trim(),
        azureSpeechKey: azureKey.trim(),
      });
      toast("DeepL, ElevenLabs and Azure credentials are encrypted and synced.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "API credentials could not sync.", "error");
    } finally { setCredentialSyncing(null); }
  }

  async function restoreCredentials() {
    if (!user) return toast("Sign in with Google before restoring API credentials.", "error");
    setCredentialSyncing("download");
    try {
      const credentials = await downloadApiCredentials(user);
      if (!credentials) return toast("No synced API credentials were found.", "info");
      setDeeplKey(credentials.deeplKey); setElevenKey(credentials.elevenLabsKey); setAzureKey(credentials.azureSpeechKey);
      if (credentials.deeplKey) sessionStorage.setItem("deepl-api-key", credentials.deeplKey); else sessionStorage.removeItem("deepl-api-key");
      if (credentials.elevenLabsKey) sessionStorage.setItem("elevenlabs-api-key", credentials.elevenLabsKey); else sessionStorage.removeItem("elevenlabs-api-key");
      if (credentials.azureSpeechKey) sessionStorage.setItem("azure-speech-api-key", credentials.azureSpeechKey); else sessionStorage.removeItem("azure-speech-api-key");
      setDeeplStatus(credentials.deeplKey ? "connected" : "idle");
      setElevenStatus(credentials.elevenLabsKey ? "connected" : "idle");
      setAzureStatus(credentials.azureSpeechKey ? "connected" : "idle");
      toast("Synced API credentials are ready on this device.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "API credentials could not be restored.", "error");
    } finally { setCredentialSyncing(null); }
  }

  return <main className="shell"><Header /><div className="page settings-page">
    <div className="workspace-head"><Link href="/" className="back" aria-label="Back"><ArrowLeft size={20} /></Link><div><h1 className="display">Settings</h1><p>Translation, pronunciation and data preferences</p></div></div>
    <section className="settings-card"><div className="settings-icon"><KeyRound size={21} /></div><form className="settings-content" onSubmit={testDeepL}><h2>DeepL translation</h2><p>Your personal key stays in this browser session and is sent through the website only when you translate.</p><label>DeepL authentication key<input type="password" autoComplete="off" value={deeplKey} onChange={(e) => { setDeeplKey(e.target.value); setDeeplStatus("idle"); }} placeholder="Enter your DeepL API key" /></label><div className="settings-actions"><button className="primary-button" disabled={!deeplKey.trim() || deeplStatus === "testing"} type="submit">{deeplStatus === "testing" ? "Testing…" : "Test & save key"}</button>{deeplKey && <button className="secondary-button danger" type="button" onClick={removeDeepL}><Trash2 size={16} /> Remove</button>}</div>{deeplStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> Connected to DeepL</div>}<div className="security-note"><ShieldCheck size={17} /> Keys clear when this browser session ends.</div></form></section>

    <section className="settings-card"><div className="settings-icon"><Volume2 size={21} /></div><div className="settings-content"><h2>Text-to-speech</h2><p>Use a voice installed on your device, ElevenLabs, or Microsoft Azure Speech.</p><div className="engine-options"><label><input type="radio" name="tts-engine" checked={engine === "system"} onChange={() => chooseEngine("system")} /><span><strong>System voice</strong><small>Free, fast and works offline when a matching voice is installed.</small></span></label><label><input type="radio" name="tts-engine" checked={engine === "elevenlabs"} onChange={() => chooseEngine("elevenlabs")} /><span><strong>ElevenLabs</strong><small>Cloud-generated multilingual audio using your own API allowance.</small></span></label><label><input type="radio" name="tts-engine" checked={engine === "azure"} onChange={() => chooseEngine("azure")} /><span><strong>Microsoft Azure Speech</strong><small>Reliable neural speech using your Azure Speech key and region.</small></span></label></div><form onSubmit={testElevenLabs} className="nested-settings"><h3>ElevenLabs</h3><label>ElevenLabs API key<input type="password" autoComplete="off" value={elevenKey} onChange={(e) => { setElevenKey(e.target.value); setElevenStatus("idle"); }} placeholder="Enter your ElevenLabs API key" /></label><label>German voice ID<input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="ElevenLabs voice ID" /></label><div className="settings-actions"><button className="primary-button" disabled={!elevenKey.trim() || !voiceId.trim() || elevenStatus === "testing"} type="submit">{elevenStatus === "testing" ? "Generating test…" : "Test & save ElevenLabs"}</button>{elevenKey && <button className="secondary-button danger" type="button" onClick={removeEleven}><Trash2 size={16} /> Remove</button>}</div>{elevenStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> ElevenLabs is ready</div>}</form><form onSubmit={testAzure} className="nested-settings"><h3>Microsoft Azure Speech</h3><label>Speech resource key<input type="password" autoComplete="off" value={azureKey} onChange={(e) => { setAzureKey(e.target.value); setAzureStatus("idle"); setAzureVoices([]); }} placeholder="Enter Azure Speech key 1 or key 2" /></label><label>Azure region<input value={azureRegion} onChange={(e) => { setAzureRegion(e.target.value); setAzureVoices([]); }} placeholder="For example: westeurope" /></label><div className="voice-catalogue-head"><div><strong>Azure voice catalogue</strong><small>Load the voices available to your Azure region, then preview and choose one for each language.</small></div><button className="secondary-button" type="button" onClick={loadAzureVoices} disabled={voicesLoading || !azureKey.trim() || !azureRegion.trim()}>{voicesLoading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} {voicesLoading ? "Loading…" : azureVoices.length ? "Reload voices" : "Load voices"}</button></div><div className="voice-picker-grid"><label>German voice<select value={azureGermanVoice} onChange={(e) => setAzureGermanVoice(e.target.value)}>{!germanVoices.some((voice) => voice.ShortName === azureGermanVoice) && <option value={azureGermanVoice}>{azureGermanVoice}</option>}{germanVoices.map((voice) => <option key={voice.ShortName} value={voice.ShortName}>{voiceLabel(voice)}</option>)}</select></label><button className="secondary-button voice-preview" type="button" onClick={() => previewAzureVoice(azureGermanVoice, "de-DE")} disabled={!azureGermanVoice || previewingVoice !== null}>{previewingVoice === azureGermanVoice ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />} Preview German</button><label>English voice<select value={azureEnglishVoice} onChange={(e) => setAzureEnglishVoice(e.target.value)}>{!englishVoices.some((voice) => voice.ShortName === azureEnglishVoice) && <option value={azureEnglishVoice}>{azureEnglishVoice}</option>}{englishVoices.map((voice) => <option key={voice.ShortName} value={voice.ShortName}>{voiceLabel(voice)}</option>)}</select></label><button className="secondary-button voice-preview" type="button" onClick={() => previewAzureVoice(azureEnglishVoice, "en-US")} disabled={!azureEnglishVoice || previewingVoice !== null}>{previewingVoice === azureEnglishVoice ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />} Preview English</button></div>{azureVoices.length > 0 && <p className="voice-count">{germanVoices.length} German voices and {englishVoices.length} English voices available in {azureRegion}.</p>}<div className="settings-actions"><button className="primary-button" disabled={!azureKey.trim() || !azureRegion.trim() || !azureGermanVoice.trim() || azureStatus === "testing"} type="submit">{azureStatus === "testing" ? "Generating test…" : "Test & save Azure"}</button>{azureKey && <button className="secondary-button danger" type="button" onClick={removeAzure}><Trash2 size={16} /> Remove</button>}</div>{azureStatus === "connected" && <div className="connection success"><CheckCircle2 size={17} /> Azure Speech is ready</div>}{azureStatus === "invalid" && <div className="connection error">Azure could not connect. Check the resource key, region and voice.</div>}</form></div></section>

    <section className="settings-card"><div className="settings-icon"><HelpCircle size={21} /></div><div className="settings-content"><h2>Audio setup guides</h2><p>Open the guide for your selected audio method. System voice help automatically detects Windows, macOS, or Linux.</p><div className="settings-actions"><button className="secondary-button" type="button" onClick={() => window.dispatchEvent(new Event("language-islands:audio-help"))}><Volume2 size={16} /> Set up system voice</button><button className="secondary-button" type="button" onClick={() => setProviderGuide("elevenlabs")}><HelpCircle size={16} /> Find ElevenLabs key &amp; voice ID</button><button className="secondary-button" type="button" onClick={() => setProviderGuide("azure")}><HelpCircle size={16} /> Find Azure key &amp; region</button></div></div></section>

    <section className="settings-card"><div className="settings-icon"><Cloud size={21} /></div><div className="settings-content"><h2>Settings sync</h2><p>Signed-in devices share theme, layout, playback speed, translation behavior, audio provider, region and selected voices. Islands continue to sync automatically.</p><div className="settings-actions"><button className="primary-button" type="button" disabled={!user || syncing} onClick={() => void syncNow()}>{syncing ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />} {syncing ? "Syncing…" : "Sync settings now"}</button><button className="secondary-button" type="button" onClick={copyConfig}><Copy size={16} /> Copy config</button></div><h3>API credential sync</h3><p>Credential syncing is manual. It includes the DeepL authentication key, ElevenLabs API key and Microsoft Azure Speech key.</p><div className="settings-actions"><button className="primary-button" type="button" disabled={!user || credentialSyncing !== null} onClick={() => void syncCredentials()}>{credentialSyncing === "upload" ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />} {credentialSyncing === "upload" ? "Encrypting & syncing…" : "Sync config"}</button><button className="secondary-button" type="button" disabled={!user || credentialSyncing !== null} onClick={() => void restoreCredentials()}>{credentialSyncing === "download" ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />} {credentialSyncing === "download" ? "Restoring…" : "Restore synced config"}</button></div><div className="security-note"><ShieldCheck size={17} /> The three API keys are encrypted on the server before Firestore stores them. Copy config still excludes credentials. Configure <code>CONFIG_ENCRYPTION_KEY</code> in Vercel before using credential sync.</div>{user ? <div className="connection success"><CheckCircle2 size={17} /> Signed in as {user.email}{lastSyncedAt ? ` · Last synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</div> : <div className="connection error">Sign in with Google from the header to sync settings.</div>}</div></section>

    <section className="settings-card"><div className="settings-icon"><Activity size={21} /></div><div className="settings-content"><h2>API usage</h2><p>Local totals recorded by this browser. Provider dashboards remain the source of truth for billing and account-wide usage.</p><div className="usage-grid"><div><strong>{usage.translationRequests.toLocaleString()}</strong><span>Translation requests</span></div><div><strong>{usage.translationCharacters.toLocaleString()}</strong><span>Characters translated</span></div><div><strong>{usage.ttsRequests.toLocaleString()}</strong><span>Cloud audio requests</span></div><div><strong>{usage.ttsCharacters.toLocaleString()}</strong><span>Characters spoken</span></div><div><strong>≈{Math.ceil((usage.translationCharacters + usage.ttsCharacters) / 4).toLocaleString()}</strong><span>Estimated text tokens</span></div></div><div className="settings-actions"><button className="secondary-button danger" type="button" onClick={() => { resetUsage(); setUsage(readUsage()); toast("Local API statistics reset.", "info"); }}><RefreshCw size={15} /> Reset statistics</button></div></div></section>

    {providerGuide && <div className="modal-backdrop" role="presentation" onMouseDown={() => setProviderGuide(null)}><section className="modal-card provider-guide" role="dialog" aria-modal="true" aria-labelledby="provider-guide-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" type="button" onClick={() => setProviderGuide(null)} aria-label="Close"><X size={19} /></button><span className="eyebrow">Credential guide</span><h2 className="display" id="provider-guide-title">{providerGuide === "azure" ? "Find your Azure Speech details" : "Find your ElevenLabs details"}</h2>{providerGuide === "azure" ? <><div className="guide-section"><h3>1. Open your Speech resource</h3><p>Sign in to the Azure portal, search for your <strong>Speech service</strong> or <strong>Azure AI Services</strong> resource, and open it. If you have not created one yet, create a Speech resource first.</p></div><div className="guide-section"><h3>2. Copy the resource key</h3><p>In the resource menu, open <strong>Resource Management → Keys and Endpoint</strong>. Reveal and copy either <strong>KEY 1</strong> or <strong>KEY 2</strong> into “Speech resource key.” Do not use a subscription ID, resource ID, or bearer token.</p></div><div className="guide-section"><h3>3. Copy the region</h3><p>On the same page, copy the resource’s <strong>Location/Region</strong> identifier, such as <code>westeurope</code> or <code>eastus</code>. It must match the resource that issued the key.</p></div><div className="guide-tip"><strong>Voice fields:</strong> the defaults already work for German and English. You only need to change them later if you want different Azure neural voices.</div><a className="guide-link" href="https://portal.azure.com/" target="_blank" rel="noreferrer">Open Azure portal <ExternalLink size={15} /></a></> : <><div className="guide-section"><h3>1. Create an API key</h3><p>Sign in to ElevenLabs, open your profile menu, choose <strong>Developers → API Keys</strong>, then create a key. Copy it immediately and paste it into “ElevenLabs API key.”</p></div><div className="guide-section"><h3>2. Choose a voice</h3><p>Open <strong>Voices → My Voices</strong>. Find the German-capable voice you want, open its <strong>More actions</strong> menu (three dots), and select <strong>Copy voice ID</strong>.</p></div><div className="guide-section"><h3>3. Paste the voice ID</h3><p>Paste the copied ID into “German voice ID.” A voice ID is a short identifier such as <code>21m00Tcm4TlvDq8ikWAM</code>—it is not the displayed voice name.</p></div><div className="guide-tip">Some Voice Library voices may not be available through the API on every plan. If testing fails, try a voice already listed under My Voices.</div><a className="guide-link" href="https://elevenlabs.io/app/developers/api-keys" target="_blank" rel="noreferrer">Open ElevenLabs API keys <ExternalLink size={15} /></a></>}</section></div>}

    <section className="settings-card danger-zone"><div className="settings-icon"><Trash2 size={21} /></div><div className="settings-content"><h2>Delete islands</h2><p>This is the protected place for removing complete islands and their phrases from this browser.</p>{islands.length ? <div className="delete-list">{islands.map((island) => <div key={island.id}><span>{island.title}</span><button className="secondary-button danger" type="button" onClick={() => setDeleteTarget(island)}><Trash2 size={15} /> Delete</button></div>)}</div> : <p className="empty-note">No locally saved islands to delete.</p>}</div></section>
  </div>{deleteTarget && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}><section className="modal-card confirm-card" role="dialog" aria-modal="true" aria-labelledby="settings-delete-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close"><X size={19} /></button><span className="eyebrow danger">Permanent action</span><h2 className="display" id="settings-delete-title">Delete “{deleteTarget.title}”?</h2><p>All phrases in this island will be removed from this browser. This cannot be undone.</p><div className="settings-actions"><button className="primary-button destructive-button" type="button" onClick={() => deleteIsland(deleteTarget)}><Trash2 size={16} /> Delete island</button><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button></div></section></div>}</main>;
}
