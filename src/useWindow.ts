import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { useState } from "react";

type WindowState = {
  fistRun: boolean;
  winOpen: boolean;
};

export const useControlWindow = () => {
  const [winState, setWinState] = useState<WindowState>({
    fistRun: true,
    winOpen: false,
  });
  const positionWindow = async () => {
    const appWindow = getCurrentWindow();
    const monitor = await currentMonitor();

    const scaleFactor = await appWindow.scaleFactor();
    const windowSize = await appWindow.outerSize();

    if (!monitor) return;

    try {
      const x = (monitor.size.width - 20 - windowSize.width) / scaleFactor;
      const y = (monitor.size.height - 78 - windowSize.height) / scaleFactor;

      await appWindow.setPosition(new LogicalPosition(x, y));
      await appWindow.show();
      //await appWindow.setFocus();
      setWinState((state) => ({ ...state, winOpen: true }));
    } catch (error) {
      console.log("Error to position Window:", error);
    }
  };

  return {
    positionWindow,
    winState,
    setWinState,
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
