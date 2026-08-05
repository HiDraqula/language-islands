export type UsageStats = {
  translationRequests: number;
  translationCharacters: number;
  ttsRequests: number;
  ttsCharacters: number;
  updatedAt?: string;
};

const emptyUsage: UsageStats = { translationRequests: 0, translationCharacters: 0, ttsRequests: 0, ttsCharacters: 0 };

export function readUsage(): UsageStats {
  if (typeof window === "undefined") return emptyUsage;
  try { return { ...emptyUsage, ...JSON.parse(localStorage.getItem("api-usage-stats") || "{}") }; }
  catch { return emptyUsage; }
}

export function recordUsage(kind: "translation" | "tts", characters: number) {
  const current = readUsage();
  const next = kind === "translation"
    ? { ...current, translationRequests: current.translationRequests + 1, translationCharacters: current.translationCharacters + characters, updatedAt: new Date().toISOString() }
    : { ...current, ttsRequests: current.ttsRequests + 1, ttsCharacters: current.ttsCharacters + characters, updatedAt: new Date().toISOString() };
  localStorage.setItem("api-usage-stats", JSON.stringify(next));
  window.dispatchEvent(new Event("language-islands:usage-updated"));
}

export function resetUsage() {
  localStorage.removeItem("api-usage-stats");
  window.dispatchEvent(new Event("language-islands:usage-updated"));
}
