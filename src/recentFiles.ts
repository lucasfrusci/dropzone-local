import { emit } from "@tauri-apps/api/event";

export type RecentFile = {
  id: string;
  name: string;
  size: number;
  addedAt: string;
};

const STORAGE_KEY = "dropzone.recent-files";
const RECENT_FILES_EVENT = "recent-files-updated";
const MAX_RECENT_FILES = 30;

export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as RecentFile[]) : [];
  } catch {
    return [];
  }
}

export function addRecentFiles(files: File[]): void {
  const timestamp = new Date().toISOString();
  const additions = files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    size: file.size,
    addedAt: timestamp,
  }));

  saveRecentFiles([...additions, ...getRecentFiles()].slice(0, MAX_RECENT_FILES));
}

export function clearRecentFiles(): void {
  saveRecentFiles([]);
}

function saveRecentFiles(files: RecentFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    void emit(RECENT_FILES_EVENT);
  } catch (error) {
    console.error("Não foi possível salvar os arquivos recentes:", error);
  }
}
