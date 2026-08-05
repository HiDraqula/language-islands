"use client";

import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Coffee, Download, Plus, ShoppingBasket, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { ImportedIsland, ImportWizard } from "@/components/import-wizard";
import { useToast } from "@/components/ui-feedback";
import * as XLSX from "xlsx";

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
  const [importOpen, setImportOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("language-islands");
    if (saved) {
      try { const parsed = JSON.parse(saved); queueMicrotask(() => setIslands(parsed)); } catch { /* keep defaults */ }
    }
  }, []);

  useEffect(() => {
    const openImport = () => setImportOpen(true);
    window.addEventListener("open-island-import", openImport);
    return () => window.removeEventListener("open-island-import", openImport);
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

  function addImported(imported: ImportedIsland[]) {
    const next = [...islands, ...imported];
    setIslands(next); localStorage.setItem("language-islands", JSON.stringify(next));
  }

  function exportWorkbook() {
    try {
      const workbook = XLSX.utils.book_new();
      islands.forEach((island, index) => {
        let phrases: { source?: string; translation?: string }[] = [];
        try { phrases = JSON.parse(localStorage.getItem(`phrases:${island.id}`) || "[]"); } catch { /* export empty sheet */ }
        const rows = phrases.filter((phrase) => phrase.source || phrase.translation).map((phrase) => ({ English: phrase.source || "", German: phrase.translation || "" }));
        const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ English: "", German: "" }]);
        const safeName = island.title.replace(/[\\/?*:[\]]/g, " ").slice(0, 28).trim() || `Island ${index + 1}`;
        XLSX.utils.book_append_sheet(workbook, sheet, `${safeName} ${index + 1}`.slice(0, 31));
      });
      XLSX.writeFile(workbook, "language-islands.xlsx");
      toast(`Exported ${islands.length} islands to Excel.`, "success");
    } catch { toast("The Excel export could not be created.", "error"); }
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
          <div className="hero-actions">
            <button className="secondary-button" type="button" onClick={() => setImportOpen(true)}><Upload size={17} /> Import</button>
            <button className="secondary-button" type="button" onClick={exportWorkbook}><Download size={17} /> Export</button>
            <button className="primary-button" type="button" onClick={() => setOpen(true)}><Plus size={18} /> New island</button>
          </div>
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
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImport={addImported} />
    </main>
  );
}
