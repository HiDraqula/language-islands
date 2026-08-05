"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Eye, EyeOff, FileSpreadsheet, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "./ui-feedback";

type SheetData = { name: string; headers: string[]; rows: Record<string, unknown>[] };
type Mapping = { include: boolean; source: string; translation: string; islandTitle: string };

export type ImportedIsland = {
  id: string; title: string; description: string; count: number;
  icon: "coffee"; tint: string; accent: string;
};

export function ImportWizard({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (islands: ImportedIsland[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});
  const [activeSheet, setActiveSheet] = useState("");
  const toast = useToast();

  if (!open) return null;

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const parsed = workbook.SheetNames.map((name) => {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: "" });
        return { name, rows, headers: rows.length ? Object.keys(rows[0]) : [] };
      }).filter((sheet) => sheet.headers.length);
      if (!parsed.length) throw new Error("No sheets with column headers were found.");
      const nextMappings: Record<string, Mapping> = {};
      parsed.forEach((sheet) => {
        const sourceGuess = sheet.headers.find((header) => /english|source|sentence|phrase/i.test(header)) || sheet.headers[0] || "";
        const translationGuess = sheet.headers.find((header) => /german|translation|target|deutsch/i.test(header)) || "";
        nextMappings[sheet.name] = { include: true, source: sourceGuess, translation: translationGuess, islandTitle: "" };
      });
      setFileName(file.name); setSheets(parsed); setMappings(nextMappings); setActiveSheet(parsed[0].name);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not read this spreadsheet.", "error");
      event.target.value = "";
    }
  }

  function updateMapping(sheetName: string, change: Partial<Mapping>) {
    setMappings((current) => ({ ...current, [sheetName]: { ...current[sheetName], ...change } }));
  }

  function finishImport() {
    const selected = sheets.filter((sheet) => mappings[sheet.name]?.include);
    const missing = selected.find((sheet) => !mappings[sheet.name]?.source);
    if (!selected.length) return toast("Select at least one sheet to import.", "error");
    if (missing) { setActiveSheet(missing.name); return toast(`Choose the English/source column for “${missing.name}”.`, "error"); }

    const imported = selected.map((sheet, index) => {
      const mapping = mappings[sheet.name];
      const titleFromColumn = mapping.islandTitle ? String(sheet.rows.find((row) => row[mapping.islandTitle])?.[mapping.islandTitle] || "").trim() : "";
      const title = titleFromColumn || sheet.name;
      const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "island"}-${Date.now()}-${index}`;
      const phrases = sheet.rows.map((row, rowIndex) => ({
        id: `${id}-${rowIndex}`,
        source: String(row[mapping.source] ?? "").trim(),
        translation: mapping.translation ? String(row[mapping.translation] ?? "").trim() : "",
        status: "idle" as const,
      })).filter((phrase) => phrase.source || phrase.translation);
      localStorage.setItem(`phrases:${id}`, JSON.stringify(phrases.length ? phrases : [{ id: `${id}-empty`, source: "", translation: "", status: "idle" }]));
      return { id, title, description: `Imported from ${fileName} · ${sheet.name}`, count: phrases.length, icon: "coffee" as const, tint: "#dbe8df", accent: "#315f50" };
    });
    onImport(imported);
    toast(`Imported ${imported.length} ${imported.length === 1 ? "island" : "islands"} from ${fileName}.`, "success");
    setSheets([]); setFileName(""); onClose();
  }

  const current = sheets.find((sheet) => sheet.name === activeSheet);
  const mapping = current ? mappings[current.name] : undefined;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card import-card" role="dialog" aria-modal="true" aria-labelledby="import-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="eyebrow">Excel & CSV</span>
        <h2 className="display" id="import-title">Import your islands</h2>
        {!sheets.length ? (
          <button className="file-drop" type="button" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet size={30} /><strong>Choose an Excel or CSV file</strong><span>Every Excel sheet can become its own island.</span>
          </button>
        ) : (
          <div className="mapping-layout">
            <aside className="sheet-list" aria-label="Workbook sheets">
              <small>{fileName}</small>
              {sheets.map((sheet) => <div className={`sheet-item ${activeSheet === sheet.name ? "active" : ""} ${!mappings[sheet.name]?.include ? "ignored" : ""}`} key={sheet.name}><button type="button" onClick={() => setActiveSheet(sheet.name)}><strong>{sheet.name}</strong><span>{mappings[sheet.name]?.include ? `${sheet.rows.length} rows` : "Ignored"}</span></button><button className="sheet-visibility" type="button" title={mappings[sheet.name]?.include ? "Ignore this sheet" : "Include this sheet"} aria-label={mappings[sheet.name]?.include ? `Ignore ${sheet.name}` : `Include ${sheet.name}`} onClick={() => updateMapping(sheet.name, { include: !mappings[sheet.name]?.include })}>{mappings[sheet.name]?.include ? <Eye size={15} /> : <EyeOff size={15} />}</button></div>)}
            </aside>
            {current && mapping && <div className="mapping-fields">
              <label className="include-sheet"><input type="checkbox" checked={mapping.include} onChange={(event) => updateMapping(current.name, { include: event.target.checked })} /> Import this sheet <small>Turn this off to ignore the tab completely.</small></label>
              <p>Map the columns for <strong>{current.name}</strong>. The source phrase is required; the rest are optional.</p>
              <label>English / source phrase <em>Required</em><select value={mapping.source} onChange={(event) => updateMapping(current.name, { source: event.target.value })}><option value="">Select a column…</option>{current.headers.map((header) => <option key={header}>{header}</option>)}</select></label>
              <label>Existing German / translation <span>Optional</span><select value={mapping.translation} onChange={(event) => updateMapping(current.name, { translation: event.target.value })}><option value="">Do not import</option>{current.headers.map((header) => <option key={header}>{header}</option>)}</select></label>
              <label>Island name column <span>Optional — sheet name used by default</span><select value={mapping.islandTitle} onChange={(event) => updateMapping(current.name, { islandTitle: event.target.value })}><option value="">Use “{current.name}”</option>{current.headers.map((header) => <option key={header}>{header}</option>)}</select></label>
              <div className="mapping-preview"><div><strong>Island preview</strong><span>First {Math.min(3, current.rows.length)} entries after mapping</span></div><div className="preview-table"><div className="preview-head"><span>English / source</span><span>German / translation</span></div>{current.rows.slice(0, 3).map((row, index) => <div className="preview-row" key={index}><span>{mapping.source ? String(row[mapping.source] || "—") : "Choose a source column"}</span><span>{mapping.translation ? String(row[mapping.translation] || "—") : "Will be translated later"}</span></div>)}</div><small>Island name: <strong>{mapping.islandTitle ? String(current.rows.find((row) => row[mapping.islandTitle])?.[mapping.islandTitle] || current.name) : current.name}</strong></small></div>
            </div>}
          </div>
        )}
        <input ref={inputRef} hidden type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={readFile} />
        <div className="import-actions">
          {sheets.length ? <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>Choose another file</button> : null}
          {sheets.length ? <button className="primary-button" type="button" onClick={finishImport}><Upload size={16} /> Import selected sheets</button> : null}
        </div>
      </section>
    </div>
  );
}
