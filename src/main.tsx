import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { InfoWindow } from "./about";
import { RecentFilesWindow } from "./recent-window";
import { SettingsWindow } from "./settings-window";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/info",
    element: <InfoWindow />,
  },
  {
    path: "/about",
    element: <InfoWindow />,
  },
  {
    path: "/recent",
    element: <RecentFilesWindow />,
  },
  {
    path: "/settings",
    element: <SettingsWindow />,
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
