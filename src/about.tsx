import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import "./about.css";
import { useEffect, useState } from "react";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { useTheme } from "./hooks/useTheme";

type Appinfo = {
  version: string;
  name: string;
};

export const AboutWindow = () => {
  const [appinfo, setAppinfo] = useState<Appinfo | null>(null);
  useTheme();

  const getAppinfo = async () => {
    try {
      const data: Appinfo = await invoke("get_appinfo");
      setAppinfo(data);
    } catch (err) {
      console.log("Error to get Appinfo.");
    }
  };

  const openProfile = (event: React.MouseEvent) => {
    //COMENTEI O STOP PROPAGATION, QUANDO CLICA NO LINK JA FECHA A JANELA ABOUT...
    //event.stopPropagation();
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
      <span className="autor github" onClick={openProfile}>
        github.com/lucasfrusci
      </span>
    </div>
  );
};
