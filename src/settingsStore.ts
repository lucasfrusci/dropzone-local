import { emit } from "@tauri-apps/api/event";

export type ThemePreference = "system" | "light" | "dark";

export type AppSettings = {
  theme: ThemePreference;
  receiveFolder: string;
};

const STORAGE_KEY = "dropzone.settings";
const THEME_EVENT = "dropzone-theme-changed";

export function getSettings(): AppSettings {
  const defaults: AppSettings = { theme: "system", receiveFolder: "" };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    void emit(THEME_EVENT, settings.theme);
  } catch (error) {
    console.error("Não foi possível salvar as configurações:", error);
  }
}
