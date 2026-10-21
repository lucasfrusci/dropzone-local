import { ReactNode, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export type MenuActionProps = {
  label: string;
  hotkey?: string;
  action?: () => void;
};

const MenuItemRoot = ({ children }: { children: ReactNode }) => {
  return <div className="actions">{children}</div>;
};

export const MenuAction = ({ label, hotkey = "", action }: MenuActionProps) => {
  const optionRef = useRef<HTMLDivElement>(null);
  useHotkeys(
    hotkey,
    () => {
      const actionEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
      });

      optionRef.current?.dispatchEvent(actionEvent);
    },
    {
      enabled: hotkey != "",
      preventDefault: true,
    },
  );
  return (
    <div ref={optionRef} className="action-item" onClick={action}>
      <span className="action-label">{label}</span>
      {hotkey && <span className="action-shortcut">{hotkey}</span>}
    </div>
  );
};

export const MenuItems = {
  Root: MenuItemRoot,
};
