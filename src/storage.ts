import { titleToSlug, ensureUniqueSlug } from "./slug";

export const APP_STATE_KEY = "chit-app-state";
export const UI_STATE_KEY = "chit-ui";

export type Page = { id: string; title: string; slug: string; icon?: string; parentId?: string };

export interface AppState {
  pages: Page[];
  trash: Page[];
  activeId: string;
}

export interface UIState {
  sidebarOpen: boolean;
  sidebarPeek: boolean;
  expanded: string[];
  trashOpen: boolean;
}

export const ABOUT_ID = "about-chit";

export const defaultAppState: AppState = {
  pages: [
    { id: ABOUT_ID, title: "About Chit", slug: "about-chit", icon: "📖" },
    { id: "1", title: "", slug: "untitled", icon: undefined },
  ],
  trash: [],
  activeId: "1",
};

export const defaultUIState: UIState = {
  sidebarOpen: false,
  sidebarPeek: false,
  expanded: [],
  trashOpen: false,
};

function migratePagesSlug(pages: { id: string; title: string; slug?: string; icon?: string; parentId?: string }[]): Page[] {
  const result: Page[] = [];
  for (const p of pages) {
    if (typeof (p as Page).slug === "string" && (p as Page).slug) {
      result.push(p as Page);
      continue;
    }
    const title = p.title?.trim() || "";
    const baseSlug = p.id === ABOUT_ID ? "about-chit" : titleToSlug(title || "untitled");
    const slug = ensureUniqueSlug(baseSlug, result, p.id);
    result.push({ ...p, slug } as Page);
  }
  return result;
}

export function loadAppState(): AppState | null {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (raw == null) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as AppState).pages) ||
      !Array.isArray((data as AppState).trash) ||
      typeof (data as AppState).activeId !== "string"
    )
      return null;
    const state = data as AppState;
    const pages = migratePagesSlug(state.pages);
    const trash = migratePagesSlug(state.trash);
    return { ...state, pages, trash };
  } catch {
    return null;
  }
}

export function saveAppState(state: AppState): void {
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
}

export function loadUIState(): UIState | null {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (raw == null) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      !data ||
      typeof data !== "object" ||
      typeof (data as UIState).sidebarOpen !== "boolean" ||
      typeof (data as UIState).sidebarPeek !== "boolean" ||
      !Array.isArray((data as UIState).expanded) ||
      typeof (data as UIState).trashOpen !== "boolean"
    )
      return null;
    return data as UIState;
  } catch {
    return null;
  }
}

export function saveUIState(state: UIState): void {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
}
