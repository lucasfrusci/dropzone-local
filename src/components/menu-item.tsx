import { HTMLAttributes, ReactNode, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export type MenuActionProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  hotkey?: string;
};

const MenuItemRoot = ({ children }: { children: ReactNode }) => {
  return <div className="actions">{children}</div>;
};

export const MenuAction = ({
  label,
  hotkey = "",
  ...rest
}: MenuActionProps) => {
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
    <div ref={optionRef} className="action-item" {...rest}>
      <span className="action-label">{label}</span>
      {hotkey && <span className="action-shortcut">{hotkey}</span>}
    </div>
  );
};

export const MenuItems = {
  Root: MenuItemRoot,
};
