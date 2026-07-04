import { createContext, useContext } from "react";

export type MobileShell = {
  /** Mo ngan danh sach cuoc choi tren mobile. */
  openGames: () => void;
};

export const MobileShellContext = createContext<MobileShell | null>(null);

export function useMobileShell() {
  return useContext(MobileShellContext);
}
