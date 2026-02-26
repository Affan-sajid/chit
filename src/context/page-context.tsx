import { createContext } from "react";
import type { Page } from "../storage";

export type { Page };

interface PageContextValue {
  pages: Page[];
  navigate: (id: string) => void;
}

export const PageContext = createContext<PageContextValue>({
  pages: [],
  navigate: () => {},
});
