export const LOCAL_DATA_CHANGED = "language-islands:local-data-changed";
export const PREFERENCES_APPLIED = "language-islands:preferences-applied";

export const SYNCED_PREFERENCE_KEYS = [
  "theme",
  "tts-engine",
  "elevenlabs-german-voice",
  "elevenlabs-english-voice",
  "azure-speech-region",
  "azure-german-voice",
  "azure-english-voice",
  "translate-on-enter",
  "island-density",
  "playback-rate",
  "audio-enabled",
  "system-german-voice",
  "system-english-voice",
] as const;

export type SyncedPreferences = Partial<Record<(typeof SYNCED_PREFERENCE_KEYS)[number], string>>;

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
  preferences?: SyncedPreferences;
  version?: number;
  updatedAt?: number;
};

export function notifyLocalDataChanged() {
  window.dispatchEvent(new Event(LOCAL_DATA_CHANGED));
}

export function savePreference(key: (typeof SYNCED_PREFERENCE_KEYS)[number], value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  notifyLocalDataChanged();
}

export function readSyncedPreferences(): SyncedPreferences {
  return Object.fromEntries(SYNCED_PREFERENCE_KEYS.flatMap((key) => {
    const value = localStorage.getItem(key);
    return value === null ? [] : [[key, value]];
  })) as SyncedPreferences;
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
  return { islands, phrases, preferences: readSyncedPreferences(), version: 2, updatedAt: Date.now() };
}

export function applyCloudState(state: CloudState) {
  localStorage.setItem("language-islands", JSON.stringify(state.islands || []));
  Object.entries(state.phrases || {}).forEach(([islandId, phrases]) => localStorage.setItem(`phrases:${islandId}`, JSON.stringify(phrases)));
  if (state.preferences) {
    SYNCED_PREFERENCE_KEYS.forEach((key) => {
      const value = state.preferences?.[key];
      if (value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    });
    window.dispatchEvent(new Event(PREFERENCES_APPLIED));
  }
  window.dispatchEvent(new Event("language-islands:cloud-applied"));
}
