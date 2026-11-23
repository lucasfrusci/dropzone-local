import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getSettings, saveSettings, ThemePreference } from "./settingsStore";
import { useTheme } from "./hooks/useTheme";
import "./utility-windows.css";

export function SettingsWindow() {
  useTheme();
  const [settings, setSettings] = useState(getSettings);

  const close = () => void invoke("close_window", { name: "settings" });

  const updateTheme = (theme: ThemePreference) => {
    const next = { ...settings, theme };
    setSettings(next);
    saveSettings(next);
  };

  const chooseReceiveFolder = async () => {
    try {
      const folder = await open({ directory: true, multiple: false });
      if (typeof folder !== "string") return;

      const next = { ...settings, receiveFolder: folder };
      setSettings(next);
      saveSettings(next);
    } catch (error) {
      console.error("Não foi possível escolher a pasta:", error);
    }
  };

  return (
    <main className="utility-window settings-window">
      <header className="utility-header">
        <div>
          <p className="utility-eyebrow">DROPZONE</p>
          <h1>Configurações</h1>
          <p className="utility-description">Personalize o aplicativo.</p>
        </div>
        <button className="utility-close" onClick={close} aria-label="Fechar">
          ×
        </button>
      </header>

      <section className="settings-section">
        <label className="settings-label" htmlFor="theme-preference">
          Aparência
        </label>
        <select
          id="theme-preference"
          className="settings-select"
          value={settings.theme}
          onChange={(event) => updateTheme(event.target.value as ThemePreference)}
        >
          <option value="system">Seguir o sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </section>

      <section className="settings-section">
        <span className="settings-label">Pasta para arquivos recebidos</span>
        <p className="settings-help">
          Local onde os arquivos recebidos serão salvos neste computador.
        </p>
        <div className="folder-picker-row">
          <span className="folder-path" title={settings.receiveFolder}>
            {settings.receiveFolder || "Pasta padrão do sistema"}
          </span>
          <button className="utility-button" onClick={chooseReceiveFolder}>
            Escolher
          </button>
        </div>
      </section>

      <p className="settings-footer">As alterações são salvas automaticamente.</p>
    </main>
  );
}
