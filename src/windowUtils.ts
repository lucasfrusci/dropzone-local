import { LogicalPosition } from "@tauri-apps/api/dpi";
import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";

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
    visible: false,
  });

  //DELAY TO REMOVE BLINK IF SYSTEM IS ON DARKMODE,
  // ONLY ON FIRST TIME WINDOW OPEN.
  setTimeout(() => {
    about.show();
  }, 250);

  // about.once("tauri://window-created", () =>
  //   console.log("About window created."),
  // );
};
