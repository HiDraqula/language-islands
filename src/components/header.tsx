"use client";

import Link from "next/link";
import { Cloud, Languages, LoaderCircle, LogOut, Settings, Upload } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./auth-provider";
import { AudioQuickSettings } from "./audio-quick-settings";

export function Header() {
  const { user, loading, syncing, signIn, signOutUser } = useAuth();
  return (
    <header className="topbar">
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="brand-mark"><Languages size={20} /></span>
        <span>Language Islands</span>
      </Link>
      <nav className="top-actions" aria-label="Main navigation">
        <button className="secondary-button" type="button" onClick={() => window.dispatchEvent(new Event("open-island-import"))}><Upload size={16} /> Import</button>
        <AudioQuickSettings />
        <ThemeToggle />
        <Link href="/settings" className="icon-button" aria-label="Settings"><Settings size={20} /></Link>
        {user ? <button className="secondary-button" type="button" onClick={signOutUser} title={user.email || "Signed in"}><Cloud size={16} /> <span className="account-label">{user.displayName?.split(" ")[0] || "Account"}</span><LogOut size={14} /></button> : <button className="primary-button" type="button" onClick={signIn} disabled={loading}>{loading ? "Loading…" : "Sign in with Google"}</button>}
      </nav>
      {syncing && <div className="sync-status" role="status" aria-live="polite"><LoaderCircle className="spin" size={16} /> Syncing…</div>}
    </header>
  );
}
