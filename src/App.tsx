import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { openAboutWindow } from "./about";
import { useDrag } from "./useDrag";

function App() {
  const { files, isDragging, setIsDragging } = useDrag();
  //@ts-ignore
  const [recentUploads, setRecentUploads] = useState<string[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
    // TODO: Implement file upload logic
  };

  const handleClose = async () => {
    try {
      await invoke("close");
    } catch (err) {
      console.log("Erro ao fechar!");
    }
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });
      if (selected) {
        console.log("Selected files:", selected);
        // TODO: Implement file upload logic
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleUploadFromClipboard = async () => {
    try {
      const clipboardText = await readText();
      console.log("Clipboard content:", clipboardText);
      // TODO: Implement clipboard upload logic
    } catch (error) {
      console.error("Error reading clipboard:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        handleSelectFile();
      } else if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        handleUploadFromClipboard();
      } else if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        console.log("Recent uploads");
      } else if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        openAboutWindow();
        console.log("About Dropzone");
      } else if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        console.log("Check for updates");
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        console.log("Settings");
      } else if (e.ctrlKey && e.key === "q") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /*DRAG FILES HERE / OR USE OPTIONS BELOW */

  return (
    <main className="dropzone-container">
      <div className="drag-window-region" data-tauri-drag-region></div>

      <div
        className={`dropzone ${isDragging ? "dragging" : ""}`}
        onClick={handleSelectFile}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dropzone-content">
          <svg
            id="upload-icon"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="dropzone-text">
            {isDragging ? "Solte os arquivos aqui" : "Arraste arquivos aqui"}
          </p>
          <p className="dropzone-subtext">ou use as opções abaixo</p>
        </div>
      </div>

      <div className="actions">
        <div className="action-item" onClick={handleSelectFile}>
          <span className="action-label">Select file</span>
          <span className="action-shortcut">Ctrl+O</span>
        </div>
        {/* <div className="action-item" onClick={handleUploadFromClipboard}>
          <span className="action-label">Upload from clipboard</span>
          <span className="action-shortcut">Ctrl+V</span>
        </div> */}
        <div
          className="action-item"
          onClick={() => console.log("Recent uploads")}
        >
          <span className="action-label">Recent uploads</span>
          <span className="action-shortcut">Ctrl+R</span>
        </div>
        <div className="action-item" onClick={() => console.log("Settings")}>
          <span className="action-label">Settings</span>
          <span className="action-shortcut">Ctrl+S</span>
        </div>
        <div
          className="action-item"
          onClick={() => console.log("Check for updates")}
        >
          <span className="action-label">Check for updates</span>
          <span className="action-shortcut">Ctrl+U</span>
        </div>
        <div className="action-item" onClick={() => openAboutWindow()}>
          <span className="action-label">About Dropzone</span>
          <span className="action-shortcut">Ctrl+A</span>
        </div>
        <div className="action-item" onClick={() => handleClose()}>
          <span className="action-label">Close</span>
          <span className="action-shortcut">Ctrl+Q</span>
        </div>
      </div>

      {recentUploads.length > 0 && (
        <div className="recent-uploads">
          <h3>Recent Uploads</h3>
          <ul className="recent-list">
            {recentUploads.map((upload, index) => (
              <li key={index}>{upload}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

export default App;
