export const LOCAL_DATA_CHANGED = "language-islands:local-data-changed";

export type StoredIsland = {
  id: string;
  title: string;
  description?: string;
  count?: number;
  icon?: string;
  tint?: string;
  accent?: string;
};

export type CloudState = {
  islands: StoredIsland[];
  phrases: Record<string, unknown[]>;
  updatedAt?: number;
};

export function notifyLocalDataChanged() {
  window.dispatchEvent(new Event(LOCAL_DATA_CHANGED));
}

export function saveIslands(islands: StoredIsland[]) {
  localStorage.setItem("language-islands", JSON.stringify(islands));
  notifyLocalDataChanged();
}

export function savePhrases(islandId: string, phrases: unknown[]) {
  localStorage.setItem(`phrases:${islandId}`, JSON.stringify(phrases));
  notifyLocalDataChanged();
}

export function removeIslandData(islandId: string) {
  localStorage.removeItem(`phrases:${islandId}`);
  notifyLocalDataChanged();
}

export function readCloudState(): CloudState {
  let islands: StoredIsland[] = [];
  try { islands = JSON.parse(localStorage.getItem("language-islands") || "[]"); } catch { /* empty */ }
  const phrases: Record<string, unknown[]> = {};
  islands.forEach((island) => {
    try { phrases[island.id] = JSON.parse(localStorage.getItem(`phrases:${island.id}`) || "[]"); } catch { phrases[island.id] = []; }
  });
  return { islands, phrases, updatedAt: Date.now() };
}

export function applyCloudState(state: CloudState) {
  localStorage.setItem("language-islands", JSON.stringify(state.islands || []));
  Object.entries(state.phrases || {}).forEach(([islandId, phrases]) => localStorage.setItem(`phrases:${islandId}`, JSON.stringify(phrases)));
  window.dispatchEvent(new Event("language-islands:cloud-applied"));
}
