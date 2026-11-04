import { invoke } from "@tauri-apps/api/core";
import { memo, useEffect, useRef } from "react";

type ThemeData = {
  transparency: boolean;
  appUsesLight: boolean;
  accentColor: string;
};

export const useTheme = () => {
  const themeData = useRef<ThemeData | null>(null);
  const getThemeData = async () => {
    try {
      const data: ThemeData = await invoke("get_theme", {});
      console.log(data);
      themeData.current = data;
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDarkMode = () => {
    const root = document.querySelector(":root");
    if (themeData.current?.appUsesLight) {
      root?.setAttribute("data-theme", "light");
    } else {
      root?.setAttribute("data-theme", "dark");
    }
  };

  const setWindowEffect = () => {
    if (!themeData.current) return;
    const root = document.documentElement;
    const dragElement = <HTMLElement>(
      document.getElementsByClassName("dropzone")[0]
    );

    root.style.backgroundColor = "transparent";
    //if (dragElement) dragElement.style.backgroundColor = "transparent";
  };

  const setAccent = () => {
    if (!themeData.current) return;
    const accent = themeData.current.accentColor.substring(0, 6);
    const root = document.documentElement;
    root.style.setProperty("--acent-color", `#${accent}60`);
    root.style.setProperty("--acent-color-dragging", `#${accent}20`);
  };

  useEffect(() => {
    if (themeData.current) return;
    getThemeData().then(() => {
      setAccent();
      setWindowEffect();
      toggleDarkMode();
    });
  }, []);
};
