import { useState, useRef, useCallback, useEffect } from "react";
import { marked } from "marked";
import { loadUIState, saveUIState } from "../storage";
import type { Page } from "../storage";

interface SidebarProps {
  pages: Page[];
  trash: Page[];
  activeId: string;
  open: boolean;
  peek: boolean;
  onSelect: (id: string) => void;
  onNewPage: () => void;
  onCreateSubPage: (parentId: string) => string;
  onSetParent: (pageId: string, parentId: string | undefined) => void;
  onImport: (files: Array<{ title: string; bodyHtml: string }>) => void;
  onRestore: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function isDescendant(pages: Page[], candidateId: string, ancestorId: string): boolean {
  let current = pages.find((p) => p.id === candidateId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = pages.find((p) => p.id === current!.parentId);
  }
  return false;
}

function PageItem({
  page,
  pages,
  activeId,
  depth,
  expanded,
  onToggle,
  onSelect,
  onCreateSubPage,
  onSetParent,
  dragId,
  onDragStart,
  onDragEnd,
  dragOverId,
  onDragOverItem,
  onDropItem,
}: {
  page: Page;
  pages: Page[];
  activeId: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onCreateSubPage: (parentId: string) => string;
  onSetParent: (pageId: string, parentId: string | undefined) => void;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dragOverId: string | null;
  onDragOverItem: (id: string | null) => void;
  onDropItem: (targetId: string) => void;
}) {
  const children = pages.filter((p) => p.parentId === page.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(page.id);
  const isActive = page.id === activeId;
  const isDragging = dragId === page.id;
  const isDragOver = dragOverId === page.id && dragId !== page.id;

  return (
    <>
      <div
        className={[
          "page-item-row",
          isActive ? "page-item-active" : "",
          isDragging ? "page-item-dragging" : "",
          isDragOver ? "page-item-drag-over" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: depth * 16 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart(page.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOverItem(page.id);
        }}
        onDragLeave={() => onDragOverItem(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropItem(page.id);
        }}
      >
        {hasChildren ? (
          <button
            className="sidebar-chevron"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(page.id);
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.12s ease",
              }}
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="sidebar-chevron-spacer" />
        )}

        <button
          className="page-item"
          onClick={() => onSelect(page.id)}
        >
          {page.icon ? (
            <span className="page-item-emoji">{page.icon}</span>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="page-item-icon"
            >
              <path
                d="M4.5 2h5l3.5 3.5V13a1 1 0 01-1 1h-7.5a1 1 0 01-1-1V3a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          )}
          <span className="page-item-title">{page.title || "Untitled"}</span>
        </button>

        <button
          className="page-item-add"
          title="Add sub-page"
          onClick={(e) => {
            e.stopPropagation();
            const newId = onCreateSubPage(page.id);
            onSelect(newId);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="sidebar-children">
          {children.map((child) => (
            <PageItem
              key={child.id}
              page={child}
              pages={pages}
              activeId={activeId}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateSubPage={onCreateSubPage}
              onSetParent={onSetParent}
              dragId={dragId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              dragOverId={dragOverId}
              onDragOverItem={onDragOverItem}
              onDropItem={onDropItem}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function Sidebar({
  pages,
  trash,
  activeId,
  open,
  peek,
  onSelect,
  onNewPage,
  onCreateSubPage,
  onSetParent,
  onImport,
  onRestore,
  onDeletePermanently,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: SidebarProps) {
  const [trashOpen, setTrashOpen] = useState(() => {
    const ui = loadUIState();
    return ui?.trashOpen ?? false;
  });
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ui = loadUIState();
    const list = ui?.expanded;
    return Array.isArray(list) ? new Set(list) : new Set();
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadUIState();
    saveUIState({
      sidebarOpen: loaded?.sidebarOpen ?? false,
      sidebarPeek: loaded?.sidebarPeek ?? false,
      expanded: [...expanded],
      trashOpen,
    });
  }, [expanded, trashOpen]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const results: Array<{ title: string; bodyHtml: string }> = [];
      for (const file of Array.from(fileList)) {
        const text = await file.text();
        const title = file.name.replace(/\.md$/i, "") || "Imported";
        const bodyHtml = await marked.parse(text);
        results.push({ title, bodyHtml });
      }

      onImport(results);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onImport],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
    setDragId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleDropOnItem = useCallback(
    (targetId: string) => {
      const src = dragIdRef.current;
      if (!src || src === targetId) return;
      if (isDescendant(pages, targetId, src)) return;
      onSetParent(src, targetId);
      setExpanded((prev) => new Set(prev).add(targetId));
      handleDragEnd();
    },
    [pages, onSetParent, handleDragEnd],
  );

  const handleDropOnNav = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const src = dragIdRef.current;
      if (!src) return;
      onSetParent(src, undefined);
      handleDragEnd();
    },
    [onSetParent, handleDragEnd],
  );

  const rootPages = pages.filter((p) => !p.parentId && p.id !== "about-chit");

  const cls = [
    "sidebar",
    open ? "sidebar-open" : "",
    peek ? "sidebar-peek" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      className={cls}
      onMouseEnter={peek ? onMouseEnter : undefined}
      onMouseLeave={peek ? onMouseLeave : undefined}
    >
      <div className="sidebar-brand">
        <img src="/logo.png" alt="chit" className="sidebar-logo" />
      </div>
      <button className="sidebar-about-btn" onClick={() => onSelect("about-chit")}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.1" />
          <path d="M8 7v4M8 5.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        About Chit
      </button>

      <button
        className="sidebar-about-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        <img src="/logo.png" alt="" className="sidebar-about-btn-icon" aria-hidden />
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2v8M4.5 6.5L8 3l3.5 3.5M3 11v2h10v-2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Import .md
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="sidebar-divider" />

      <div className="sidebar-top">
        <button
          className="sidebar-icon-btn"
          onClick={onClose}
          title="Close sidebar"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className="sidebar-icon-btn"
          onClick={onNewPage}
          title="New page"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav
        className="sidebar-list"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={handleDropOnNav}
      >
        {rootPages.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            pages={pages}
            activeId={activeId}
            depth={0}
            expanded={expanded}
            onToggle={toggleExpanded}
            onSelect={onSelect}
            onCreateSubPage={onCreateSubPage}
            onSetParent={onSetParent}
            dragId={dragId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            dragOverId={dragOverId}
            onDragOverItem={setDragOverId}
            onDropItem={handleDropOnItem}
          />
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="trash-toggle-btn"
          onClick={() => setTrashOpen((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 4.5h10M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M4.5 4.5l.5 8.5a1 1 0 001 1h4a1 1 0 001-1l.5-8.5"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Trash</span>
          {trash.length > 0 && (
            <span className="trash-count">{trash.length}</span>
          )}
        </button>

        {trashOpen && (
          <div className="trash-section">
            {trash.length === 0 ? (
              <div className="trash-empty">No pages in trash</div>
            ) : (
              trash.map((page) => (
                <div key={page.id} className="trash-item">
                  <span className="trash-item-title">
                    {page.icon && (
                      <span className="trash-item-emoji">{page.icon}</span>
                    )}
                    {page.title || "Untitled"}
                  </span>
                  <div className="trash-item-actions">
                    <button
                      className="trash-action-btn"
                      onClick={() => onRestore(page.id)}
                      title="Restore"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M2.5 6.5l3-3m-3 3l3 3m-3-3H10a3.5 3.5 0 010 7H8"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      className="trash-action-btn trash-action-danger"
                      onClick={() => onDeletePermanently(page.id)}
                      title="Delete permanently"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
