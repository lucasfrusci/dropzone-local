import { LogicalPosition } from "@tauri-apps/api/dpi";
import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { emitTo } from "@tauri-apps/api/event";

const openUtilityWindow = async (
  label: string,
  title: string,
  route: string,
  width: number,
  height: number,
  view?: "about" | "updates",
) => {
  const existing = await WebviewWindow.getByLabel(label);
  const mainWindow = getCurrentWebviewWindow();
  const scaleFactor = await mainWindow.scaleFactor();
  const mainPosition = await mainWindow.outerPosition();
  const mainSize = await mainWindow.outerSize();
  if (!mainPosition) return;

  const x = mainPosition.x / scaleFactor - width - 16;
  const y =
    mainPosition.y / scaleFactor +
    (mainSize.height / scaleFactor - height) / 2;

  if (existing) {
    if (view) await emitTo(label, "info-window-view", view);
    await existing.setPosition(new LogicalPosition(x, y));
    await existing.show();
    await existing.setFocus();
    return;
  }

  const utilityWindow = new WebviewWindow(label, {
    url: `/#/${route}`,
    title,
    width,
    height,
    resizable: false,
    maximizable: false,
    minimizable: false,
    decorations: false,
    alwaysOnTop: true,
    x,
    y,
    visible: false,
  });

  setTimeout(() => void utilityWindow.show(), 250);
};

export const openAboutWindow = () =>
  openUtilityWindow("about", "Dropzone", "info?view=about", 300, 120, "about");

export const openCheckUpdatesWindow = () =>
  openUtilityWindow("about", "Dropzone", "info?view=updates", 300, 120, "updates");

export const openRecentFilesWindow = () =>
  openUtilityWindow("recent", "Arquivos recentes", "recent", 390, 460);

export const openSettingsWindow = () =>
  openUtilityWindow("settings", "Configurações", "settings", 390, 360);
