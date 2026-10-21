import { event } from "@tauri-apps/api";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { RefObject, useEffect, useState } from "react";

export const useDrag = (dropAreaRef: RefObject<HTMLElement | null>) => {
  const [files, setFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    let unlistenDrop: any;

    // const dropArea = document
    //   .getElementsByClassName("dropzone")[0]
    //   .getBoundingClientRect();

    const setupDrag = async () => {
      const appWindow = getCurrentWebviewWindow();
      const scaleFactor = await appWindow.scaleFactor();

      unlistenDrop = await appWindow.onDragDropEvent((event) => {
        if (event.payload.type === "leave") {
          setIsDragging(false);
          //console.log("Operação cancelada ou o cursor saiu da janela");
          return;
        }

        const dropArea = dropAreaRef.current?.getBoundingClientRect();
        if (!dropArea) return;

        const { x, y } = event.payload.position.toLogical(scaleFactor);

        const isMouseOverDroArea =
          x >= dropArea.left &&
          x <= dropArea.right &&
          y >= dropArea.top &&
          y <= dropArea.bottom;

        if (!isMouseOverDroArea) {
          setIsDragging(false);
          return;
        }

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
            //Caminhos absolutos dos arquivos soltos na janela
            const filePaths = event.payload.paths;
            setFiles(filePaths);
            console.log("Arquivos soltos:", filePaths);
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
