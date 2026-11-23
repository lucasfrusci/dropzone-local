import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { clearRecentFiles, getRecentFiles, RecentFile } from "./recentFiles";
import { useTheme } from "./hooks/useTheme";
import "./utility-windows.css";

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function RecentFilesWindow() {
  useTheme();
  const [files, setFiles] = useState<RecentFile[]>(getRecentFiles);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let canceled = false;

    listen("recent-files-updated", () => setFiles(getRecentFiles())).then(
      (unsubscribe) => {
        if (canceled) unsubscribe();
        else unlisten = unsubscribe;
      },
    );

    return () => {
      canceled = true;
      unlisten?.();
    };
  }, []);

  const close = () => void invoke("close_window", { name: "recent" });

  const clearHistory = () => {
    clearRecentFiles();
    setFiles([]);
  };

  return (
    <main className="utility-window">
      <header className="utility-header">
        <div>
          <p className="utility-eyebrow">DROPZONE</p>
          <h1>Arquivos recentes</h1>
          <p className="utility-description">
            Arquivos adicionados à área de envio neste computador.
          </p>
        </div>
        <button className="utility-close" onClick={close} aria-label="Fechar">
          ×
        </button>
      </header>

      {files.length === 0 ? (
        <div className="utility-empty">
          <span className="utility-empty-icon">▤</span>
          <strong>Nenhum arquivo recente</strong>
          <span>Os arquivos que você adicionar aparecerão aqui.</span>
        </div>
      ) : (
        <>
          <div className="recent-window-list">
            {files.map((file) => (
              <article className="recent-window-item" key={file.id}>
                <span className="recent-file-icon">▤</span>
                <div className="recent-file-details">
                  <strong title={file.name}>{file.name}</strong>
                  <span>
                    {formatSize(file.size)} ·{" "}
                    {new Date(file.addedAt).toLocaleString()}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <button className="utility-text-button" onClick={clearHistory}>
            Limpar histórico
          </button>
        </>
      )}
    </main>
  );
}
