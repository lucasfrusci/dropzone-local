import { ReactNode } from "react";

export type MenuActionProps = {
  label: string;
  hotkey?: string;
  action?: () => void;
};

const MenuItemRoot = ({ children }: { children: ReactNode }) => {
  return <div className="actions">{children}</div>;
};

export const MenuAction = (props: MenuActionProps) => {
  return (
    <div className="action-item" onClick={props.action}>
      <span className="action-label">{props.label}</span>
      {props.hotkey && <span className="action-shortcut">{props.hotkey}</span>}
    </div>
  );
};

export const MenuItems = {
  Root: MenuItemRoot,
};
