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
      {guideOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setGuideOpen(false)}><section className="modal-card audio-card voice-guide" role="dialog" aria-modal="true" aria-labelledby="voice-guide-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setGuideOpen(false)} aria-label="Close"><X size={19} /></button><span className="eyebrow">System voice help</span><h2 className="display" id="voice-guide-title">Install a German voice</h2>{platform === "linux" && <><p>On Ubuntu or Debian, open Terminal and run:</p><pre><code>sudo apt update{"\n"}sudo apt install speech-dispatcher espeak-ng espeak-ng-data</code></pre><p>Fully close and reopen your browser afterward. Chrome on Linux may still not expose every installed voice; if it does not, choose Azure Speech or ElevenLabs in Settings.</p></>}{platform === "windows" && <><p>Open <strong>Settings → Time &amp; language → Language &amp; region</strong>. Add German, open its language options, and install the <strong>Speech</strong> feature. Restart the browser afterward.</p></>}{platform === "mac" && <><p>Open <strong>System Settings → Accessibility → Spoken Content → System Voice → Manage Voices</strong>, then download a German voice and restart the browser.</p></>}{platform === "other" && <p>Install German text-to-speech from your device’s language, speech, or accessibility settings, then restart the browser.</p>}<div className="settings-actions"><button className="primary-button" type="button" onClick={() => { setGuideOpen(false); setAudioPrompt(false); router.push("/settings"); }}><ExternalLink size={16} /> Choose cloud audio</button><button className="secondary-button" type="button" onClick={enableAudio}><Volume2 size={16} /> Test again</button></div></section></div>}
    </ToastContext.Provider>
  );
}
