"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { PREFERENCES_APPLIED, savePreference } from "@/lib/local-data";

type Theme = "system" | "light" | "dark";
const nextTheme: Record<Theme, Theme> = { system: "dark", dark: "light", light: "system" };

function applyTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const refresh = () => {
      const saved = localStorage.getItem("theme");
      const initial: Theme = saved === "light" || saved === "dark" ? saved : "system";
      queueMicrotask(() => setTheme(initial));
      applyTheme(initial);
    };
    refresh();
    window.addEventListener(PREFERENCES_APPLIED, refresh);
    return () => window.removeEventListener(PREFERENCES_APPLIED, refresh);
  }, []);

  function cycleTheme() {
    const next = nextTheme[theme];
    setTheme(next);
    applyTheme(next);
    savePreference("theme", next === "system" ? null : next);
  }

  const label = theme === "system" ? "Theme: system (click for dark)" : `Theme: ${theme} (click to change)`;
  return (
    <button className="icon-button" type="button" onClick={cycleTheme} aria-label={label} title={label}>
      {theme === "system" ? <Monitor size={19} /> : theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  );
}
