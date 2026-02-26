import "./App.css";
import { useRef, useEffect, useState, useCallback } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { marked } from "marked";
import Editor from "./components/editor";
import Sidebar from "./components/sidebar";
import PageToolbar from "./components/page-toolbar";
import { PageContext, type Page } from "./context/page-context";
import { Routes, Route, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  loadAppState,
  saveAppState,
  loadUIState,
  saveUIState,
  defaultAppState,
} from "./storage";
import { titleToSlug, ensureUniqueSlug } from "./slug";
import aboutChitMd from "../ABOUT_CHIT.md?raw";

function getNextId(pages: Page[], trash: Page[]): number {
  let max = 0;
  for (const p of [...pages, ...trash]) {
    const n = parseInt(p.id, 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return max + 1;
}

const RANDOM_POOL = [
  "🎮","🚀","🧠","📘","⚡","🔥","🎯","🛠️","🌙","✨","🎨","🧩",
  "😀","😎","🤖","🎉","📝","💡","📌","🍀","🎵","🏆","🌊","🦋",
];

function randomEmoji(exclude?: string) {
  const choices = RANDOM_POOL.filter((e) => e !== exclude);
  return choices[Math.floor(Math.random() * choices.length)];
}

function getAncestors(pages: Page[], pageId: string): Page[] {
  const result: Page[] = [];
  let current = pages.find((p) => p.id === pageId);
  while (current?.parentId) {
    const parent = pages.find((p) => p.id === current!.parentId);
    if (!parent) break;
    result.unshift(parent);
    current = parent;
  }
  return result;
}

const ABOUT_ID = "about-chit";
const DRAFT_ID = "__draft__";
const ABOUT_HTML = (marked.parse(aboutChitMd.trim()) as string).trim();

function ChitApp() {
  const location = useLocation();
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const pathSlug = params.slug;
  const isRoot = location.pathname === "/";

  const [pages, setPages] = useState<Page[]>(() => {
    // Always restore original About content on load so edits are not persisted
    localStorage.setItem("chit-page-" + ABOUT_ID, ABOUT_HTML);
    const loaded = loadAppState();
    return loaded?.pages ?? defaultAppState.pages;
  });
  const [trash, setTrash] = useState<Page[]>(() => {
    const loaded = loadAppState();
    return loaded?.trash ?? defaultAppState.trash;
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const loaded = loadAppState();
    const pagesLoaded = loaded?.pages ?? defaultAppState.pages;
    const candidate = loaded?.activeId ?? defaultAppState.activeId;
    if (candidate === DRAFT_ID) return DRAFT_ID;
    return pagesLoaded.some((p) => p.id === candidate) ? candidate : (pagesLoaded[0]?.id ?? "1");
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const loaded = loadUIState();
    return loaded?.sidebarOpen ?? false;
  });
  const [sidebarPeek, setSidebarPeek] = useState(() => {
    const loaded = loadUIState();
    return loaded?.sidebarPeek ?? false;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftPageIds, setDraftPageIds] = useState<Set<string>>(new Set());
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const focusBodyRef = useRef<() => void>(() => {});
  const creatingForSlugRef = useRef<string | null>(null);

  const draftPage: Page = { id: DRAFT_ID, title: "", slug: "", icon: undefined };
  const activePage = pages.find((p) => p.id === activeId) ?? (activeId === DRAFT_ID ? draftPage : undefined)!;
  const ancestors = activePage && activePage.id !== DRAFT_ID ? getAncestors(pages, activeId) : [];

  useEffect(() => {
    const pagesToSave = pages.filter((p) => !draftPageIds.has(p.id));
    const activeIdToSave =
      activeId === DRAFT_ID || draftPageIds.has(activeId)
        ? (pagesToSave[0]?.id ?? activeId)
        : activeId;
    saveAppState({ pages: pagesToSave, trash, activeId: activeIdToSave });
  }, [pages, trash, activeId, draftPageIds]);

  useEffect(() => {
    if (activeId === DRAFT_ID) return;
    if (pages.length > 0 && !pages.some((p) => p.id === activeId)) {
      setActiveId(pages[0].id);
    }
  }, [pages, activeId]);

  // Sync URL -> state: root = draft, /:slug = resolve or create page
  useEffect(() => {
    if (isRoot) {
      creatingForSlugRef.current = null;
      setActiveId(DRAFT_ID);
      return;
    }
    if (pathSlug == null || pathSlug === "") return;
    const slug = decodeURIComponent(pathSlug);
    if (creatingForSlugRef.current && creatingForSlugRef.current !== slug) {
      creatingForSlugRef.current = null;
    }
    const existing = pages.find((p) => p.slug === slug);
    if (existing) {
      creatingForSlugRef.current = null;
      setActiveId(existing.id);
      return;
    }
    if (creatingForSlugRef.current === slug) return;
    creatingForSlugRef.current = slug;
    const title = slug.replace(/_/g, " ").trim() || "Untitled";
    const uniqueSlug = ensureUniqueSlug(slug, pages);
    const id = String(getNextId(pages, trash));
    const newPage: Page = { id, title, slug: uniqueSlug, icon: undefined };
    setPages((prev) => [...prev, newPage]);
    setActiveId(id);
    if (uniqueSlug !== slug) {
      navigate(`/${uniqueSlug}`, { replace: true, state: { focusBody: true } });
    } else {
      navigate(location.pathname, { replace: true, state: { focusBody: true } });
    }
    // Intentionally not including pages/trash so we only run when URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoot, pathSlug]);

  useEffect(() => {
    const loaded = loadUIState();
    saveUIState({
      sidebarOpen,
      sidebarPeek,
      expanded: loaded?.expanded ?? [],
      trashOpen: loaded?.trashOpen ?? false,
    });
  }, [sidebarOpen, sidebarPeek]);

  function autoResize() {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  useEffect(() => { autoResize(); }, [activeId]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.value = activePage.title;
      autoResize();
      if (!activePage.title) titleRef.current.focus();
    }
  }, [activeId, activePage.title]);

  useEffect(() => { setPickerOpen(false); }, [activeId]);

  // Update favicon: use active page emoji if set, otherwise pencil.svg
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const emoji = activePage?.icon;
    if (emoji && emoji.trim()) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="26" x="16" text-anchor="middle" font-size="24" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${emoji}</text></svg>`;
      link.href = "data:image/svg+xml," + encodeURIComponent(svg);
      link.type = "image/svg+xml";
    } else {
      link.href = "/pencil.svg";
      link.type = "image/svg+xml";
    }
  }, [activePage?.icon]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const commitDraft = useCallback(
    (titleFromInput?: string) => {
      const title = (titleFromInput ?? titleRef.current?.value ?? "").trim() || "Untitled";
      const slug = ensureUniqueSlug(titleToSlug(title), pages);
      const id = String(getNextId(pages, trash));
      const draftHtml = localStorage.getItem("chit-page-" + DRAFT_ID) || "";
      localStorage.setItem("chit-page-" + id, draftHtml);
      localStorage.removeItem("chit-page-" + DRAFT_ID);
      const newPage: Page = { id, title, slug, icon: undefined };
      setPages((prev) => [...prev, newPage]);
      setActiveId(id);
      navigate(`/${slug}`, { replace: true, state: { focusBody: true } });
    },
    [pages, trash, navigate]
  );

  const handleTitleInput = useCallback(() => {
    autoResize();
    const value = titleRef.current?.value ?? "";
    if (activeId === DRAFT_ID) {
      // Don't commit on every keystroke; commit only when they edit the body (handlePageEdited)
      return;
    }
    setDraftPageIds((prev) => {
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
    setPages((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, title: value } : p))
    );
  }, [activeId]);

  const handleTitleBlur = useCallback(() => {
    if (activeId === DRAFT_ID) return;
    const value = titleRef.current?.value ?? "";
    const newSlug = ensureUniqueSlug(titleToSlug(value || "untitled"), pages, activeId);
    setPages((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, slug: newSlug } : p))
    );
    navigate(`/${newSlug}`, { replace: true });
  }, [activeId, pages, navigate]);

  const handleNewPage = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleCreateSubPage = useCallback(
    (parentId: string): string => {
      const id = String(getNextId(pages, trash));
      const slug = ensureUniqueSlug("untitled", pages);
      setDraftPageIds((prev) => new Set(prev).add(id));
      setPages((prev) => [...prev, { id, title: "", slug, icon: undefined, parentId }]);
      return id;
    },
    [pages, trash],
  );

  const handleSetParent = useCallback(
    (pageId: string, parentId: string | undefined) => {
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, parentId } : p)),
      );
    },
    [],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        handleNewPage();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleNewPage]);

  const handleDelete = useCallback(
    (id: string) => {
      if (id === ABOUT_ID) return;
      const isDraft = draftPageIds.has(id);
      if (isDraft) localStorage.removeItem("chit-page-" + id);
      setDraftPageIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      const page = pages.find((p) => p.id === id);
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const newTrash = page && !isDraft ? [page, ...trash] : trash;
        const newId = String(getNextId([], newTrash));
        const newSlug = ensureUniqueSlug("untitled", []);
        if (page && !isDraft) setTrash([page, ...trash]);
        setPages([{ id: newId, title: "", slug: newSlug, icon: undefined }]);
        setActiveId(newId);
        setDraftPageIds((d) => new Set(d).add(newId));
        navigate(`/${newSlug}`);
      } else {
        if (page && !isDraft) setTrash([page, ...trash]);
        setPages(remaining);
        if (id === activeId) {
          setActiveId(remaining[0].id);
          navigate(`/${remaining[0].slug}`);
        }
      }
    },
    [activeId, trash, draftPageIds, navigate, pages],
  );

  const handleRestore = useCallback((id: string) => {
    setTrash((prev) => {
      const page = prev.find((p) => p.id === id);
      if (page) setPages((pp) => [...pp, page]);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleDeletePermanently = useCallback((id: string) => {
    setTrash((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setIcon = useCallback(
    (icon: string | undefined) => {
      setPages((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, icon } : p))
      );
    },
    [activeId]
  );

  const handleIconClick = useCallback(() => {
    if (!activePage.icon) {
      setIcon(randomEmoji());
    } else {
      setPickerOpen((prev) => !prev);
    }
  }, [activePage.icon, setIcon]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePickerSelect = useCallback((emoji: any) => {
    setIcon(emoji.native as string);
    setPickerOpen(false);
  }, [setIcon]);

  const handleImport = useCallback(
    (files: Array<{ title: string; bodyHtml: string }>) => {
      let firstId = "";
      let runningPages = [...pages];
      const newPages: Page[] = [];
      for (const f of files) {
        const id = String(getNextId(runningPages, trash));
        const slug = ensureUniqueSlug(titleToSlug(f.title), runningPages);
        if (!firstId) firstId = id;
        const page: Page = { id, title: f.title, slug, icon: undefined };
        newPages.push(page);
        runningPages = [...runningPages, page];
        localStorage.setItem(`chit-page-${id}`, f.bodyHtml);
      }
      setPages((prev) => [...prev, ...newPages]);
      if (firstId) {
        const first = newPages.find((p) => p.id === firstId)!;
        setActiveId(firstId);
        navigate(`/${first.slug}`);
      }
    },
    [pages, trash, navigate],
  );

  const handleRemove = useCallback(() => {
    setIcon(undefined);
    setPickerOpen(false);
  }, [setIcon]);

  const handlePageEdited = useCallback(() => {
    if (activeId === DRAFT_ID) {
      commitDraft();
      return;
    }
    setDraftPageIds((prev) => {
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
  }, [activeId, commitDraft]);

  const handleNavigateToPage = useCallback(
    (id: string) => {
      const page = pages.find((p) => p.id === id);
      if (page) {
        setActiveId(id);
        navigate(`/${page.slug}`);
      }
    },
    [pages, navigate]
  );

  const pageContextValue = { pages, navigate: handleNavigateToPage };

  return (
    <PageContext.Provider value={pageContextValue}>
      <div className="app-layout">
        <Sidebar
          pages={pages}
          trash={trash}
          activeId={activeId}
          open={sidebarOpen}
          peek={sidebarPeek}
          onSelect={handleNavigateToPage}
          onNewPage={handleNewPage}
          onCreateSubPage={handleCreateSubPage}
          onSetParent={handleSetParent}
          onImport={handleImport}
          onRestore={handleRestore}
          onDeletePermanently={handleDeletePermanently}
          onClose={() => { setSidebarOpen(false); setSidebarPeek(false); }}
          onMouseEnter={() => setSidebarPeek(true)}
          onMouseLeave={() => setSidebarPeek(false)}
        />

        {!sidebarOpen && (
          <div
            className="sidebar-hover-zone"
            onMouseEnter={() => setSidebarPeek(true)}
          />
        )}

        <button
          className={`toggle-btn ${sidebarOpen ? "toggle-btn-visible" : ""}`}
          onClick={() => setSidebarOpen((open) => !open)}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 3v12" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        <main className="app-main">
          <PageToolbar onDelete={activeId !== ABOUT_ID && activeId !== DRAFT_ID ? () => handleDelete(activeId) : undefined} />
          <div className="notion-page">
            <div className="notion-content">
              {ancestors.length > 0 && (
                <div className="breadcrumbs">
                  {ancestors.map((a, i) => (
                    <span key={a.id}>
                      <button
                        className="breadcrumb-link"
                        onClick={() => handleNavigateToPage(a.id)}
                      >
                        {a.icon && <span className="breadcrumb-icon">{a.icon}</span>}
                        {a.title || "Untitled"}
                      </button>
                      {i < ancestors.length - 1 && (
                        <span className="breadcrumb-sep">/</span>
                      )}
                    </span>
                  ))}
                  <span className="breadcrumb-sep">/</span>
                  <span className="breadcrumb-current">
                    {activePage.icon && <span className="breadcrumb-icon">{activePage.icon}</span>}
                    {activePage.title || "Untitled"}
                  </span>
                </div>
              )}
              <div className="page-icon-row" ref={rowRef}>
                <button
                  type="button"
                  className={`page-icon-trigger ${activePage.icon ? "has-icon" : ""} ${pickerOpen ? "open" : ""}`}
                  onClick={handleIconClick}
                  title={activePage.icon ? "Change icon" : "Add random icon"}
                >
                  {activePage.icon ? (
                    <span className="page-icon-emoji">{activePage.icon}</span>
                  ) : (
                    <span className="page-icon-label">Add icon</span>
                  )}
                </button>

                {pickerOpen && (
                  <div className="page-icon-picker-wrap">
                    <Picker
                      data={data}
                      onEmojiSelect={handlePickerSelect}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="page-icon-remove"
                      onClick={handleRemove}
                    >
                      Remove icon
                    </button>
                  </div>
                )}
              </div>
              <textarea
                ref={titleRef}
                className="notion-title"
                placeholder="Untitled"
                rows={1}
                onInput={handleTitleInput}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (activeId === DRAFT_ID) {
                    commitDraft();
                  } else {
                    handleTitleBlur();
                    focusBodyRef.current();
                  }
                }}
                defaultValue={activePage.title}
              />
              <Editor
                key={activeId}
                onCreateSubPage={handleCreateSubPage}
                activePageId={activeId}
                childPageIds={pages
                  .filter((p) => p.parentId === activeId)
                  .map((p) => p.id)}
                onEdited={handlePageEdited}
                focusBodyOnMount={location.state?.focusBody === true}
                registerFocus={(fn) => { focusBodyRef.current = fn; }}
              />
            </div>
          </div>
        </main>
      </div>
    </PageContext.Provider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChitApp />} />
      <Route path="/:slug" element={<ChitApp />} />
    </Routes>
  );
}
