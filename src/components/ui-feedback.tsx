"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Volume2, X } from "lucide-react";
import { playText } from "@/lib/audio";
import { useRouter } from "next/navigation";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);

export function useToast() { return useContext(ToastContext); }

export function UiFeedback({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [audioPrompt, setAudioPrompt] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const shouldPrompt = sessionStorage.getItem("audio-intro-dismissed") !== "true";
    queueMicrotask(() => setAudioPrompt(shouldPrompt));
  }, []);

  useEffect(() => {
    const openGuide = () => setGuideOpen(true);
    window.addEventListener("language-islands:audio-help", openGuide);
    return () => window.removeEventListener("language-islands:audio-help", openGuide);
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4500);
  }, []);

  function dismissAudio() {
    sessionStorage.setItem("audio-intro-dismissed", "true");
    setAudioPrompt(false);
  }

  async function enableAudio() {
    const result = await playText("Audio ist aktiviert.", "de-DE");
    if (result.ok) {
      localStorage.setItem("audio-enabled", "true");
      toast(result.voiceName ? `Audio is ready · ${result.voiceName}` : "Audio is ready.", "success");
      dismissAudio();
    } else {
      localStorage.removeItem("audio-enabled");
      toast(result.message, "error");
      if ((localStorage.getItem("tts-engine") || "system") === "system") setGuideOpen(true);
    }
  }

  const platform = typeof navigator === "undefined" ? "other" : /win/i.test(navigator.userAgent) ? "windows" : /mac/i.test(navigator.userAgent) ? "mac" : /linux|x11/i.test(navigator.userAgent) ? "linux" : "other";

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((item) => (
          <div className={`toast toast-${item.kind}`} key={item.id}>
            {item.kind === "success" ? <CheckCircle2 size={18} /> : null}
            <span>{item.message}</span>
            <button type="button" onClick={() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id))} aria-label="Dismiss notification"><X size={16} /></button>
          </div>
        ))}
      </div>
      {audioPrompt && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card audio-card" role="dialog" aria-modal="true" aria-labelledby="audio-title">
            <div className="settings-icon"><Volume2 size={22} /></div>
            <span className="eyebrow">One quick setup</span>
            <h2 className="display" id="audio-title">Enable pronunciation audio?</h2>
            <p>Your browser needs one click before the website can play German automatically after a translation.</p>
            <div className="settings-actions">
              <button className="primary-button" type="button" onClick={enableAudio}><Volume2 size={17} /> Enable & test audio</button>
              <button className="secondary-button" type="button" onClick={dismissAudio}>Not now</button>
            </div>
          </section>
        </div>
      )}
      {guideOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setGuideOpen(false)}><section className="modal-card audio-card voice-guide" role="dialog" aria-modal="true" aria-labelledby="voice-guide-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setGuideOpen(false)} aria-label="Close"><X size={19} /></button><span className="eyebrow">System voice help · {platform === "linux" ? "Linux" : platform === "windows" ? "Windows" : platform === "mac" ? "macOS" : "Your device"}</span><h2 className="display" id="voice-guide-title">Make system audio work</h2><div className="guide-section"><h3>1. Allow sound in the browser</h3><p>Click the site-controls icon beside the address bar, open site settings, and set <strong>Sound</strong> to <strong>Allow</strong>. Also confirm that this tab and your computer are not muted.</p></div>{platform === "linux" && <><div className="guide-section"><h3>2. Install speech support on Ubuntu or Debian</h3><p>Open Terminal and run:</p><pre><code>sudo apt update{"\n"}sudo apt install speech-dispatcher espeak-ng espeak-ng-data</code></pre></div><div className="guide-section"><h3>3. Restart the browser completely</h3><p>Close every Chrome/Chromium window, reopen it, return here, and select <strong>Test again</strong>. Linux browsers do not always expose installed voices; if the test still fails, use Azure Speech or ElevenLabs from Settings.</p></div></>}{platform === "windows" && <><div className="guide-section"><h3>2. Install the German speech pack</h3><p>Open <strong>Settings → Time &amp; language → Language &amp; region</strong>. Add German if needed, select its menu, open <strong>Language options</strong>, and install <strong>Speech</strong>.</p></div><div className="guide-section"><h3>3. Restart the browser</h3><p>Close all browser windows, reopen the website, and select <strong>Test again</strong>.</p></div></>}{platform === "mac" && <><div className="guide-section"><h3>2. Download a German voice</h3><p>Open <strong>System Settings → Accessibility → Spoken Content → System Voice → Manage Voices</strong>, then download a German voice.</p></div><div className="guide-section"><h3>3. Restart the browser</h3><p>Close and reopen the browser, return here, and select <strong>Test again</strong>.</p></div></>}{platform === "other" && <div className="guide-section"><h3>2. Install a German voice</h3><p>Open your device’s language, speech, or accessibility settings, install German text-to-speech, then restart the browser.</p></div>}<div className="settings-actions"><button className="primary-button" type="button" onClick={() => { setGuideOpen(false); setAudioPrompt(false); router.push("/settings"); }}><ExternalLink size={16} /> Choose cloud audio</button><button className="secondary-button" type="button" onClick={enableAudio}><Volume2 size={16} /> Test again</button></div></section></div>}
    </ToastContext.Provider>
  );
}
