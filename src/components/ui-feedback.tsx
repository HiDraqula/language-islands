"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, Volume2, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => undefined);

export function useToast() { return useContext(ToastContext); }

export function UiFeedback({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [audioPrompt, setAudioPrompt] = useState(false);

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

  function enableAudio() {
    if (!("speechSynthesis" in window)) {
      toast("Audio is not supported by this browser.", "error");
      dismissAudio();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Audio ist aktiviert.");
    utterance.lang = "de-DE";
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("de"));
    if (germanVoice) utterance.voice = germanVoice;
    utterance.onend = () => toast("Audio is ready.", "success");
    utterance.onerror = () => toast("Audio could not start. Check browser sound and installed voices.", "error");
    window.speechSynthesis.speak(utterance);
    localStorage.setItem("audio-enabled", "true");
    dismissAudio();
  }

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
    </ToastContext.Provider>
  );
}
