import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState, type MouseEvent } from "react";
import { useSearchParams } from "react-router-dom";
import "./about.css";
import { useTheme } from "./hooks/useTheme";

type Appinfo = {
  version: string;
  name: string;
};

type InfoView = "about" | "updates";

function AboutContent() {
  const [appinfo, setAppinfo] = useState<Appinfo | null>(null);

  useEffect(() => {
    invoke<Appinfo>("get_appinfo")
      .then(setAppinfo)
      .catch((error) => console.error("Não foi possível carregar os dados do app:", error));
  }, []);

  const openProfile = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    void invoke("open_link_wrapper", {
      link: "https://github.com/lucasfrusci",
    });
  };

  return (
    <>
      <div>
        <span className="appname">{appinfo?.name ?? "Dropzone"}</span>
        <span className="version"> v{appinfo?.version ?? "..."} alpha</span>
      </div>
      <span className="autor">Datasoft © 2027 All rights reserved</span>
      <span className="autor github" onClick={openProfile}>
        github.com/lucasfrusci
      </span>
    </>
  );
}

function CheckUpdatesContent() {
  const [appinfo, setAppinfo] = useState<Appinfo | null>(null);

  useEffect(() => {
    invoke<Appinfo>("get_appinfo").then(setAppinfo).catch(() => undefined);
  }, []);

  return (
    <div className="updates-content">
      <strong>Check for updates</strong>
      <span>Versão atual: {appinfo?.version ?? "..."}</span>
      <span className="autor">A verificação automática ainda não está configurada.</span>
    </div>
  );
}

export function InfoWindow() {
  useTheme();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<InfoView>(
    searchParams.get("view") === "updates" ? "updates" : "about",
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let canceled = false;

    listen<InfoView>("info-window-view", (event) => {
      setView(event.payload === "updates" ? "updates" : "about");
    }).then((unsubscribe) => {
      if (canceled) unsubscribe();
      else unlisten = unsubscribe;
    });

    return () => {
      canceled = true;
      unlisten?.();
    };
  }, []);

  const closeWindow = () => void invoke("close_window", { name: "about" });

  return (
    <div className="about-window" onClick={closeWindow}>
      {view === "about" ? <AboutContent /> : <CheckUpdatesContent />}
    </div>
  );
}
