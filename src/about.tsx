import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import "./about.css";
import { useEffect, useState } from "react";
import { event } from "@tauri-apps/api";
import { LogicalPosition } from "@tauri-apps/api/dpi";

//const isAbout = window.location.hash === "#about";

export const openAboutWindow = async () => {
  const existing = await WebviewWindow.getByLabel("about");
  const mainWindow = getCurrentWebviewWindow();

  const scaleFactor = await mainWindow.scaleFactor();

  const mainPos = await mainWindow.outerPosition();

  if (!mainPos) return;

  const x = mainPos.x / scaleFactor + 20;
  const y = mainPos.y / scaleFactor + 170; // 220 - 50 METADE DO HEIGHT DA JANELA - METADE DESSA JANELA

  if (existing) {
    existing.setPosition(new LogicalPosition(x, y));
    existing.show();
    existing.setFocus();
    return;
  }

  const about = new WebviewWindow("about", {
    url: "/#/about",
    title: "About",
    width: 300,
    height: 100,
    resizable: false,
    maximizable: false,
    minimizable: false,
    decorations: false,
    alwaysOnTop: true,
    x: x,
    y: y,
  });

  about.once("tauri://window-created", () =>
    console.log("About window created."),
  );
};

type Appinfo = {
  version: string;
  name: string;
};

export const AboutWindow = () => {
  const [appinfo, setAppinfo] = useState<Appinfo | null>(null);

  const getAppinfo = async () => {
    try {
      const data: Appinfo = await invoke("get_appinfo");
      setAppinfo(data);
    } catch (err) {
      console.log("Error to get Appinfo.");
    }
  };

  const openProfile = (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      invoke("open_link_wrapper", { link: "https://github.com/lucasfrusci" });
    } catch (e) {}
  };

  const closeWindow = async () => {
    invoke("close_window", { name: "about" });
  };

  useEffect(() => {
    getAppinfo();
  }, []);

  return (
    <div className="about-window" onClick={closeWindow}>
      <div>
        <span className="appname">{appinfo?.name}</span>
        <span className="version"> v{appinfo?.version} alpha</span>
      </div>
      <span className="autor">Datasoft © 2027 All rights reserved</span>
      <span className="autor github" onClick={(e) => openProfile(e)}>
        github.com/lucasfrusci
      </span>
    </div>
  );
};
