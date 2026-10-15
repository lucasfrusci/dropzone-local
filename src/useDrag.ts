import { event } from "@tauri-apps/api";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useState } from "react";

export const useDrag = () => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    let unlistenDrop: any;

    const setupDrag = async () => {
      const appWindow = getCurrentWebviewWindow();
      const dragArea = document.getElementsByClassName("dropzone")[0];

      unlistenDrop = await appWindow.onDragDropEvent((event) => {
        switch (event.payload.type) {
          case "enter":
            //console.log('Arquivo entrou na janela do aplicativo');
            break;

          case "over":
            setIsDragging(true);
            //console.log('Arrastando arquivo sobre a janela. Posição:', event.payload.position);
            break;

          case "drop":
            setIsDragging(false);
            // Caminhos absolutos dos arquivos soltos na janela
            const filePaths = event.payload.paths;
            console.log("Arquivos soltos:", filePaths);
            break;

          case "leave":
            setIsDragging(false);
            console.log("Operação cancelada ou o cursor saiu da janela");
            break;
        }
      });
    };

    setupDrag();

    return () => {
      if (unlistenDrop) unlistenDrop();
    };
  }, []);

  return { files, isDragging, setIsDragging };
};
