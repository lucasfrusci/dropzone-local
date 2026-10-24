import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";

const MARGIN_RIGHT = 68;
const MARGIN_BOTTOM = 68;

export const useControlWindow = () => {
  const [winOpen, setWinOpen] = useState<boolean>(false);
  const isTransparent = useRef(false);

  const positionWindow = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;

      const scale = monitor.scaleFactor;
      const monitorPos = monitor.position.toLogical(scale);
      const monitorSize = monitor.size.toLogical(scale);
      const winSize = (await appWindow.outerSize()).toLogical(scale);

      const x = monitorPos.x + monitorSize.width - winSize.width - MARGIN_RIGHT;
      const y =
        monitorPos.y + monitorSize.height - winSize.height - MARGIN_BOTTOM;

      await appWindow.setPosition(new LogicalPosition(x, y));
      await appWindow.show();
      setWinOpen(true);
    } catch (error) {
      console.log("Error to position Window:", error);
    }
  }, []);

  // THIS FUNCTION CHANGE ROOT AND DRAG ELEMENT TO TRANSPARENT
  // TO WORK THE MICA EFFECT, I DISABLED IT FOR NOW.
  const setWindowEffect = useCallback(async () => {
    try {
      const root = document.documentElement;
      const dragElement = <HTMLElement>(
        document.getElementsByClassName("dropzone")[0]
      );
      root.style.backgroundColor = "transparent";
      dragElement.style.backgroundColor = "transparent";
    } catch (err) {
      console.log("Error to set mica Effect.");
    }
  }, []);

  // const positionRef = useRef(positionWindow);
  // positionRef.current = positionWindow;

  useEffect(() => {
    let unlisten: () => void | undefined;
    let canceled = false;

    listen("open_window", () => positionWindow()).then((fn) => {
      if (canceled) fn();
      else unlisten = fn;
    });

    return () => {
      canceled = true;
      unlisten?.();
    };
  }, []);

  return {
    positionWindow,
    winOpen,
    setWinOpen,
  };
};

// FUNCAO DO EVENT LISTENER QUE É CHAMADO DIRETO DO RUST, AINDA NAO USADO
// export const openWindow = (func: () => void) => {
//   useEffect(() => {
//     let unlisten: any;

//     const setupInitWindow = async () => {
//       unlisten = await listen("open_window", (event) => {
//         console.log(event.payload);
//         func();
//       });
//     };

//     setupInitWindow();

//     return () => {
//       if (unlisten) unlisten();
//     };
//   }, []);
// };
