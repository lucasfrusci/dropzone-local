import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { openAboutWindow } from "./about";
import { useControlWindow } from "./hooks/useWindow";
import { usePageView } from "./hooks/usePageView";
import { useDropzone } from "react-dropzone";
import { ProgressBar } from "./components/progress-bar";
import { emit } from "@tauri-apps/api/event";
import { MenuAction, MenuItems } from "./components/menu-item";

function App() {
  const { positionWindow, setWinOpen } = useControlWindow();
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [filesQueue, setFilesQueue] = useState<File[]>([]);

  const { togglePage } = usePageView();
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const [progressBar, setProgressBar] = useState<number>(0);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleStartUpload,
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const handleClose = async () => {
    try {
      await invoke("close");
      setWinOpen(false);
    } catch (err) {
      console.log("Erro ao fechar!");
    }
  };

  async function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;

    if (!items) return;

    for (const i in items) {
      const item = items[i];

      if (item.kind === "file") {
        const blob = item.getAsFile();
        setFilesQueue((state) => ({ ...state, blob }));
      }
    }
  }

  const emitUploadProgress = (progress: number) => {
    emit("progress", { progress });
  };

  function handleStartUpload(files: File[]) {
    setFilesQueue(files);

    setTimeout(() => {
      setProgressBar(25);
      emitUploadProgress(25);
    }, 500);

    setTimeout(() => {
      setProgressBar(50);
      emitUploadProgress(50);
    }, 500 * 2);

    setTimeout(() => {
      setProgressBar(75);
      emitUploadProgress(75);
    }, 500 * 3);

    setTimeout(() => {
      setProgressBar(100);
      emitUploadProgress(100);
    }, 500 * 4);

    setTimeout(() => {
      setProgressBar(0);
      emitUploadProgress(0);
      setFilesQueue([]);
    }, 500 * 5);
  }

  const status =
    filesQueue.length > 0 ? "accept" : isDragActive ? "active" : "pending";

  useEffect(() => {
    //POSITION THE WINDOW ON BOTTOM RIGHT, OPEN WINDOW AFTER START APP.
    positionWindow();
  }, []);

  return (
    <main className="dropzone-container">
      <div className="drag-window-region" data-tauri-drag-region></div>

      <div
        ref={dropAreaRef}
        {...getRootProps()}
        data-status={status}
        className={`dropzone ${status === "active" && "dragging"} ${status === "pending" && "hover"}`}
        onClick={open}
        // onDragOver={handleDragOver}
        // onDragLeave={handleDragLeave}
        // onDrop={handleDrop}
      >
        <input {...getInputProps()} />

        {status === "active" && "Start Upload..."}

        <div className="dropzone-content">
          {status === "pending" && (
            <>
              {/* <svg
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
              </svg> */}
              <p className="dropzone-text">
                {isDragActive
                  ? "Solte os arquivos aqui"
                  : "Arraste arquivos aqui"}
              </p>
              <p className="dropzone-subtext">ou use as opções abaixo</p>
            </>
          )}

          {status === "accept" &&
            (filesQueue.length > 1 ? (
              <p className="dropzone-subtext">
                Uploading {filesQueue.length} file(s)...
              </p>
            ) : (
              <p className="dropzone-subtext">
                Uploading{" "}
                {filesQueue[0].name.length > 30
                  ? filesQueue[0].name.substring(0, 30).concat("...")
                  : filesQueue[0].name}
              </p>
            ))}
          {status === "accept" && <ProgressBar status={progressBar} />}
        </div>
      </div>

      <MenuItems.Root>
        <MenuAction label="Select file" hotkey="Ctrl+O" action={open} />
        {/* <MenuItems.Action
          label="Upload from clipboard"
          hotkey="Ctrl+Shift+V"
          action={open}
        /> */}
        <MenuAction
          label="Recent uploads"
          hotkey="Ctrl+U"
          action={() => togglePage("recents")}
        />
        <MenuAction
          label="Settings"
          hotkey="Ctrl+;"
          action={() => togglePage("settings")}
        />
        <MenuAction label="Check for updates" />
        <MenuAction label="About Dropzone" action={openAboutWindow} />
        <MenuAction label="Close" hotkey="Ctrl+Q" action={handleClose} />
      </MenuItems.Root>

      {/* {recentUploads.length > 0 && (
          <div className="recent-uploads">
            <h3>Recent Uploads</h3>
            <ul className="recent-list">
              {recentUploads.map((upload, index) => (
                <li key={index}>{upload}</li>
              ))}
            </ul>
          </div>
        )} */}

      {/* <SettingsView changePage={() => togglePage("settings")} />
      <RecentsListView changePage={() => togglePage("recents")} /> */}
    </main>
  );
}

export default App;
