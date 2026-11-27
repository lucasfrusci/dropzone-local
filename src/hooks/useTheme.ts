import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { getSettings, ThemePreference } from "../settingsStore";

type ThemeData = {
  transparency: boolean;
  appUsesLight: boolean;
  accentColor: string;
};

export const useTheme = () => {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let canceled = false;

    const splitColor = (color: string) => {
      const split = color.match(new RegExp(".{1," + 2 + "}", "g"));
      if (!split) return color;
      return split[2] + split[1] + split[0];
    };

    const applyTheme = async (override?: ThemePreference) => {
      try {
        const themeData = await invoke<ThemeData>("get_theme");
        const preference = override ?? getSettings().theme;
        const useLightTheme =
          preference === "system"
            ? themeData.appUsesLight
            : preference === "light";
        const root = document.documentElement;

        root.setAttribute("data-theme", useLightTheme ? "light" : "dark");
        //TEMPORARILY DISABLED
        //if (themeData.transparency) root.style.backgroundColor = "transparent";

        let accent = themeData.accentColor.substring(0, 6);
        accent = splitColor(accent);
        if (accent) {
          root.style.setProperty("--acent-color", `#${accent}60`);
          root.style.setProperty("--acent-color-dragging", `#${accent}20`);
        }
      } catch (error) {
        console.error("Não foi possível carregar o tema do sistema:", error);
      }
    };

    void applyTheme();
    listen<ThemePreference>("dropzone-theme-changed", (event) => {
      void applyTheme(event.payload);
    }).then((unsubscribe) => {
      if (canceled) unsubscribe();
      else unlisten = unsubscribe;
    });

    return () => {
      canceled = true;
      unlisten?.();
    };
  }, []);
};
