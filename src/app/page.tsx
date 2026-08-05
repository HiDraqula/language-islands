"use client";

import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Coffee, Plus, ShoppingBasket, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";

type Island = { id: string; title: string; description: string; count: number; icon: "coffee" | "basket" | "briefcase"; tint: string; accent: string };

const defaults: Island[] = [
  { id: "daily-conversations", title: "Daily conversations", description: "Small talk, greetings and phrases for everyday moments.", count: 2, icon: "coffee", tint: "#e7e0ca", accent: "#8a6c2e" },
  { id: "grocery-shopping", title: "Grocery shopping", description: "Find products, ask questions and feel at home at the market.", count: 0, icon: "basket", tint: "#dbe8df", accent: "#315f50" },
  { id: "work-and-study", title: "Work & study", description: "Useful language for university, meetings and new opportunities.", count: 0, icon: "briefcase", tint: "#f2dcd4", accent: "#a45c46" },
];

const icons = { coffee: Coffee, basket: ShoppingBasket, briefcase: BriefcaseBusiness };
const colors = [
  { tint: "#dbe8df", accent: "#315f50" },
  { tint: "#e7e0ca", accent: "#8a6c2e" },
  { tint: "#f2dcd4", accent: "#a45c46" },
];

export default function Home() {
  const [islands, setIslands] = useState<Island[]>(defaults);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("language-islands");
    if (saved) {
      try { setIslands(JSON.parse(saved)); } catch { /* keep defaults */ }
    }
  }, []);

  const total = useMemo(() => islands.reduce((sum, island) => sum + island.count, 0), [islands]);

  function createIsland(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const color = colors[islands.length % colors.length];
    const next = [...islands, {
      id: `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "island"}-${Date.now()}`,
      title: cleanTitle,
      description: description.trim() || "A new collection of useful phrases.",
      count: 0,
      icon: "coffee" as const,
      ...color,
    }];
    setIslands(next);
    localStorage.setItem("language-islands", JSON.stringify(next));
    setTitle(""); setDescription(""); setOpen(false);
  }

  return (
    <main className="shell">
      <Header />
      <div className="page">
        <section className="hero">
          <div>
            <span className="eyebrow">Your language world</span>
            <h1 className="display">Learn in little worlds that make sense.</h1>
            <p>Collect the phrases you actually need, organise them by context, and hear how they sound—one island at a time.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setOpen(true)}><Plus size={18} /> New island</button>
        </section>
        <div className="section-heading">
          <h2>Your islands</h2>
          <span className="count">{islands.length} islands · {total} phrases</span>
        </div>
        <section className="island-grid" aria-label="Language islands">
          {islands.map(({ id, title: islandTitle, description: islandDescription, count, icon, tint, accent }) => {
            const Icon = icons[icon] ?? Coffee;
            return (
              <article className="island-card" key={id} style={{ "--tint": tint, "--accent": accent } as React.CSSProperties}>
                <div className="island-icon"><Icon size={22} /></div>
                <h3 className="display">{islandTitle}</h3>
                <p>{islandDescription}</p>
                <div className="card-footer">
                  <span>{count} phrases · English → German</span>
                  <Link className="open-pill" href={`/islands/${id}?title=${encodeURIComponent(islandTitle)}&description=${encodeURIComponent(islandDescription)}`} aria-label={`Open ${islandTitle}`}><ArrowUpRight size={17} /></Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <form className="modal-card" onSubmit={createIsland} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button>
            <span className="eyebrow">Create a collection</span>
            <h2 className="display">New island</h2>
            <label>Island name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Travel & directions" /></label>
            <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Useful phrases for getting around" rows={3} /></label>
            <button className="primary-button" type="submit"><Plus size={17} /> Create island</button>
          </form>
        </div>
      )}
    </main>
  );
}
