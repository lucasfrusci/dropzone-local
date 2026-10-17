import { useEffect, useState } from "react";
import "./page-view.css";

export const BackIcon = () => {
  return (
    <svg viewBox="0 0 32 32" id="back-icon">
      <path
        d="M15.25 25 6.25 16l9-9M7.5 16h18.25"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="3px"
      />
    </svg>
  );
};

export const SettingsView = ({ changePage }: { changePage: () => void }) => {
  const [named, setNamed] = useState<string>("");

  useEffect(() => {
    const time = setTimeout(() => {
      setNamed("LUCAS MOAB");
    }, 5000);
    return () => clearTimeout(time);
  }, []);
  return (
    <main className="wrapper page settings">
      <div className="page-title" onClick={() => changePage()}>
        <div className="icon-fixed">
          <BackIcon />
        </div>

        <h3>Settings</h3>
      </div>
      <div>Settings View page teste {named}</div>
    </main>
  );
};
