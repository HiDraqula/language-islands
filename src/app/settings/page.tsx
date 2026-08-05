import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";

export default function SettingsPage() {
  return (
    <main className="shell">
      <Header />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="workspace-head">
          <Link href="/" className="back" aria-label="Back"><ArrowLeft size={20} /></Link>
          <div><h1 className="display">Settings</h1><p>Translation, audio and account preferences</p></div>
        </div>
        <section className="phrase-table" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="island-icon" style={{ "--tint": "#dbe8df", "--accent": "#315f50" } as React.CSSProperties}><KeyRound size={21} /></div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "2px 0 7px" }}>DeepL API</h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: 0 }}>Your personal key will be encrypted by the server and stored only after Firebase sign-in is connected.</p>
              <input disabled type="password" placeholder="Authentication key (coming in the Firebase milestone)" style={{ width: "100%", padding: "14px 16px", borderRadius: 13, border: "1px solid var(--line)", background: "#f0efe8", color: "var(--muted)" }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--green)", fontSize: 13, marginTop: 15 }}><ShieldCheck size={17} /> Keys will never be included in browser bundles or GitHub.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
