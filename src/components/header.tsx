"use client";

import Link from "next/link";
import { Languages, Settings, Upload } from "lucide-react";

export function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="brand-mark"><Languages size={20} /></span>
        <span>Language Islands</span>
      </Link>
      <nav className="top-actions" aria-label="Main navigation">
        <button className="secondary-button" type="button" onClick={() => window.dispatchEvent(new Event("open-island-import"))}><Upload size={16} /> Import</button>
        <Link href="/settings" className="icon-button" aria-label="Settings"><Settings size={20} /></Link>
        <button className="primary-button" type="button">Sign in</button>
      </nav>
    </header>
  );
}
