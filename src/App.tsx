import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {
  openAboutWindow,
  openCheckUpdatesWindow,
  openRecentFilesWindow,
  openSettingsWindow,
} from "./windowUtils";
import { useControlWindow } from "./hooks/useWindow";
import { useDropzone } from "react-dropzone";
import { listen } from "@tauri-apps/api/event";
import { MenuAction, MenuItems } from "./components/menu-item";
import { useTheme } from "./hooks/useTheme";
import { addRecentFiles } from "./recentFiles";

type DiscoveredDevice = {
  id: string;
  name: string;
  address: string;
};

type IncomingFileRequest = {
  requestId: string;
  senderName: string;
  fileName: string;
  fileSize: number;
};

type FileOfferResponse = {
  requestId: string;
  fileName: string;
  accepted: boolean;
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

function App() {
  useTheme();
  const { positionWindow, setWinOpen } = useControlWindow();
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const [filesQueue, setFilesQueue] = useState<File[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [availableDevices, setAvailableDevices] = useState<DiscoveredDevice[]>([]);
  const [sendMessage, setSendMessage] = useState("");
  const [incomingRequests, setIncomingRequests] = useState<IncomingFileRequest[]>([]);
  const [requestError, setRequestError] = useState("");

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

  async function handleStartUpload(files: File[]) {
    if (!selectedDevice) {
      setSendMessage("Selecione um computador antes de escolher os arquivos.");
      return;
    }

    const target = availableDevices.find((device) => device.id === selectedDevice);
    setSendMessage(`Solicitando autorização de ${target?.name ?? "outro computador"}...`);
    setFilesQueue(files);
    addRecentFiles(files);

    try {
      for (const file of files) {
        await invoke("send_file_offer", {
          targetId: selectedDevice,
          fileName: file.name,
          fileSize: file.size,
        });
      }
      setSendMessage("Pedido enviado. Aguardando a resposta do outro computador.");
    } catch (error) {
      setFilesQueue([]);
      setSendMessage(`Não foi possível enviar o pedido: ${String(error)}`);
    }
  }

  const status =
    filesQueue.length > 0 ? "accept" : isDragActive ? "active" : "pending";

  useEffect(() => {
    //POSITION THE WINDOW ON BOTTOM RIGHT, OPEN WINDOW AFTER START APP.
    positionWindow();
  }, []);

  useEffect(() => {
    let unlistenIncoming: (() => void) | undefined;
    let unlistenResponse: (() => void) | undefined;
    let canceled = false;

    Promise.all([
      listen<IncomingFileRequest>("incoming-file-request", (event) => {
        setRequestError("");
        setIncomingRequests((current) =>
          current.some((request) => request.requestId === event.payload.requestId)
            ? current
            : [...current, event.payload],
        );
      }),
      listen<FileOfferResponse>("file-offer-response", (event) => {
        setFilesQueue([]);
        setSendMessage(
          event.payload.accepted
            ? `O pedido para “${event.payload.fileName}” foi aceito. A transferência será habilitada em seguida.`
            : `O pedido para “${event.payload.fileName}” foi cancelado no outro computador.`,
        );
      }),
    ]).then(([stopIncoming, stopResponse]) => {
      if (canceled) {
        stopIncoming();
        stopResponse();
      } else {
        unlistenIncoming = stopIncoming;
        unlistenResponse = stopResponse;
      }
    });

    return () => {
      canceled = true;
      unlistenIncoming?.();
      unlistenResponse?.();
    };
  }, []);

  const respondToRequest = async (request: IncomingFileRequest, accepted: boolean) => {
    try {
      await invoke("respond_to_file_request", {
        requestId: request.requestId,
        accepted,
      });
      setIncomingRequests((current) =>
        current.filter((item) => item.requestId !== request.requestId),
      );
      setRequestError("");
    } catch (error) {
      setRequestError(`Não foi possível responder: ${String(error)}`);
    }
  };

  useEffect(() => {
    const refreshDevices = async () => {
      try {
        const devices = await invoke<DiscoveredDevice[]>("get_discovered_devices");
        setAvailableDevices(devices);
      } catch (error) {
        console.error("Não foi possível consultar os computadores da rede:", error);
      }
    };

    void refreshDevices();
    const interval = window.setInterval(refreshDevices, 2000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="dropzone-container">
      <div className="drag-window-region" data-tauri-drag-region></div>

      <label className="device-picker">
        <span className="device-picker-label">Enviar para</span>
        <select
          className="device-picker-select"
          value={selectedDevice}
          onChange={(event) => setSelectedDevice(event.target.value)}
          disabled={availableDevices.length === 0}
          aria-label="Computador de destino"
        >
          <option value="">
            {availableDevices.length === 0
              ? "Nenhum computador conectado"
              : "Selecione um computador"}
          </option>
          {availableDevices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.address})
            </option>
          ))}
        </select>
      </label>

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

        {status === "active" && "Drop file(s) here..."}

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

          {status === "accept" && (
            <p className="dropzone-subtext">
              {filesQueue.length === 1
                ? filesQueue[0].name
                : `${filesQueue.length} arquivos selecionados`}
            </p>
          )}
        </div>
      </div>

      {sendMessage && <p className="send-feedback">{sendMessage}</p>}

      {incomingRequests.length > 0 && (
        <div className="incoming-request-backdrop">
          <section className="incoming-request" role="alertdialog" aria-modal="true">
            <p className="incoming-request-eyebrow">ARQUIVO RECEBIDO</p>
            <h2>{incomingRequests[0].senderName} quer enviar um arquivo</h2>
            <div className="incoming-file-card">
              <span className="incoming-file-icon">▤</span>
              <div>
                <strong title={incomingRequests[0].fileName}>
                  {incomingRequests[0].fileName}
                </strong>
                <span>{formatFileSize(incomingRequests[0].fileSize)}</span>
              </div>
            </div>
            {requestError && <p className="incoming-request-error">{requestError}</p>}
            <div className="incoming-request-actions">
              <button
                className="request-cancel"
                onClick={() => respondToRequest(incomingRequests[0], false)}
              >
                Cancelar
              </button>
              <button
                className="request-accept"
                onClick={() => respondToRequest(incomingRequests[0], true)}
              >
                Aceitar
              </button>
            </div>
          </section>
        </div>
      )}

      <MenuItems.Root>
        <MenuAction label="Select file" hotkey="Ctrl+O" onClick={open} />
        {/* <MenuItems.Action
          label="Upload from clipboard"
          hotkey="Ctrl+Shift+V"
          action={open}
        /> */}
        <MenuAction
          label="Recent uploads"
          hotkey="Ctrl+U"
          onClick={openRecentFilesWindow}
        />
        <MenuAction
          label="Settings"
          hotkey="Ctrl+;"
          onClick={openSettingsWindow}
        />
        <MenuAction label="Check for updates" onClick={openCheckUpdatesWindow} />
        <MenuAction label="About Dropzone" onClick={openAboutWindow} />
        <MenuAction label="Close" hotkey="Ctrl+Q" onClick={handleClose} />
      </MenuItems.Root>

      {/* <SettingsView changePage={() => togglePage("settings")} />
      <RecentsListView changePage={() => togglePage("recents")} /> */}
    </main>
  );
}

export default App;
