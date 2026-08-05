"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, BriefcaseBusiness, Bus, CakeSlice, Camera, Coffee, Compass, Download, Dumbbell, GraduationCap, HeartPulse, Home as HomeIcon, Landmark, Languages, Map, Music, Palmtree, Plane, Plus, Search, ShoppingBasket, Sparkles, Store, Train, TreePine, Upload, Utensils, Users, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { ImportedIsland, ImportWizard } from "@/components/import-wizard";
import { useToast } from "@/components/ui-feedback";
import * as XLSX from "xlsx";

type Island = { id: string; title: string; description: string; count: number; icon: string; tint: string; accent: string };

const defaults: Island[] = [
  { id: "daily-conversations", title: "Daily conversations", description: "Small talk, greetings and phrases for everyday moments.", count: 2, icon: "coffee", tint: "#e7e0ca", accent: "#8a6c2e" },
  { id: "grocery-shopping", title: "Grocery shopping", description: "Find products, ask questions and feel at home at the market.", count: 0, icon: "basket", tint: "#dbe8df", accent: "#315f50" },
  { id: "work-and-study", title: "Work & study", description: "Useful language for university, meetings and new opportunities.", count: 0, icon: "briefcase", tint: "#f2dcd4", accent: "#a45c46" },
];

const iconOptions = [
  { id: "coffee", label: "Conversation", Icon: Coffee, keywords: "daily cafe morning speaking conversation" },
  { id: "basket", label: "Groceries", Icon: ShoppingBasket, keywords: "grocery shopping market supermarket food" },
  { id: "briefcase", label: "Work", Icon: BriefcaseBusiness, keywords: "work job office business career" },
  { id: "book", label: "Reading", Icon: BookOpen, keywords: "book reading vocabulary grammar study" },
  { id: "graduation", label: "School", Icon: GraduationCap, keywords: "school university college education study exam" },
  { id: "languages", label: "Languages", Icon: Languages, keywords: "language translation words phrases" },
  { id: "home", label: "Home", Icon: HomeIcon, keywords: "home house family apartment room" },
  { id: "users", label: "People", Icon: Users, keywords: "people friends family social meeting" },
  { id: "restaurant", label: "Restaurant", Icon: Utensils, keywords: "restaurant food eating menu dinner lunch" },
  { id: "store", label: "Shops", Icon: Store, keywords: "shop store buying retail" },
  { id: "plane", label: "Flights", Icon: Plane, keywords: "travel flight airport holiday vacation" },
  { id: "train", label: "Train", Icon: Train, keywords: "train station transport travel commute" },
  { id: "bus", label: "Bus", Icon: Bus, keywords: "bus transport travel commute ticket" },
  { id: "map", label: "Directions", Icon: Map, keywords: "map directions location navigation city" },
  { id: "compass", label: "Travel", Icon: Compass, keywords: "travel explore directions adventure" },
  { id: "health", label: "Health", Icon: HeartPulse, keywords: "health doctor hospital medicine body" },
  { id: "fitness", label: "Fitness", Icon: Dumbbell, keywords: "fitness gym sport exercise workout" },
  { id: "music", label: "Music", Icon: Music, keywords: "music song listening entertainment" },
  { id: "camera", label: "Memories", Icon: Camera, keywords: "camera photo memories media" },
  { id: "cake", label: "Celebrations", Icon: CakeSlice, keywords: "birthday party celebration festival" },
  { id: "landmark", label: "Culture", Icon: Landmark, keywords: "culture history museum government city" },
  { id: "nature", label: "Nature", Icon: TreePine, keywords: "nature outdoors park forest environment" },
  { id: "island", label: "Island", Icon: Palmtree, keywords: "island holiday beach leisure" },
  { id: "sparkles", label: "General", Icon: Sparkles, keywords: "general favourites ideas misc" },
] as const;
const icons = Object.fromEntries(iconOptions.map((option) => [option.id, option.Icon]));
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
  const [selectedIcon, setSelectedIcon] = useState("sparkles");
  const [iconSearch, setIconSearch] = useState("");
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
  const rankedIcons = useMemo(() => {
    const search = iconSearch.trim().toLowerCase();
    const nameWords = title.toLowerCase().split(/\W+/).filter((word) => word.length > 1);
    return iconOptions
      .map((option, index) => {
        const haystack = `${option.id} ${option.label} ${option.keywords}`.toLowerCase();
        const searchScore = search && haystack.includes(search) ? 100 : search ? -100 : 0;
        const titleScore = nameWords.reduce((score, word) => score + (haystack.includes(word) ? 12 : 0), 0);
        return { ...option, score: searchScore + titleScore - index / 100 };
      })
      .filter((option) => !search || option.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [iconSearch, title]);

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
      icon: selectedIcon,
      ...color,
    }];
    setIslands(next);
    localStorage.setItem("language-islands", JSON.stringify(next));
    setTitle(""); setDescription(""); setSelectedIcon("sparkles"); setIconSearch(""); setOpen(false);
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
            const Icon = icons[icon] ?? Sparkles;
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
            <fieldset className="icon-picker">
              <legend>Island icon</legend>
              <div className="icon-search"><Search size={16} /><input value={iconSearch} onChange={(event) => setIconSearch(event.target.value)} placeholder="Search icons…" aria-label="Search island icons" /></div>
              <div className="icon-options" role="listbox" aria-label="Choose an island icon">
                {rankedIcons.map(({ id, label, Icon }) => (
                  <button className={selectedIcon === id ? "selected" : ""} type="button" key={id} onClick={() => setSelectedIcon(id)} role="option" aria-selected={selectedIcon === id} title={label}>
                    <Icon size={20} /><span>{label}</span>
                  </button>
                ))}
                {!rankedIcons.length && <p>No matching icons. Try another word.</p>}
              </div>
            </fieldset>
            <button className="primary-button" type="submit"><Plus size={17} /> Create island</button>
          </form>
        </div>
      )}
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImport={addImported} />
    </main>
  );
}
