import { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  MoreHorizontal,
  FileText,
  FileCode2,
  FileDown,
  Link,
  Star,
  Sparkles,
  LetterText,
  Keyboard,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

type DropdownId = "export" | "more" | null;
type FontFamily = "default" | "serif" | "mono";
type ThemeChoice = "system" | "light" | "dark";

interface PageToolbarProps {
  onDelete?: () => void;
}

// ── Preference helpers (localStorage + DOM attributes) ────────

function loadPref<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T) ?? fallback;
}

function savePref(key: string, value: string) {
  localStorage.setItem(key, value);
}

function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyToRoot(attr: string, value: string) {
  document.documentElement.setAttribute(`data-${attr}`, value);
}

// ── Export helpers ─────────────────────────────────────────────

function getTitle(): string {
  const el = document.querySelector<HTMLTextAreaElement>(".notion-title");
  return el?.value?.trim() || "Untitled";
}

function getEditorText(): string {
  return document.querySelector(".ProseMirror")?.textContent ?? "";
}

function getEditorHTML(): string {
  return document.querySelector(".ProseMirror")?.innerHTML ?? "";
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";
    const tag = node.tagName.toLowerCase();
    const inner = () => Array.from(node.childNodes).map(walk).join("");

    switch (tag) {
      case "h1": return `# ${inner()}\n\n`;
      case "h2": return `## ${inner()}\n\n`;
      case "h3": return `### ${inner()}\n\n`;
      case "p": return `${inner()}\n\n`;
      case "strong": case "b": return `**${inner()}**`;
      case "em": case "i": return `*${inner()}*`;
      case "s": case "del": return `~~${inner()}~~`;
      case "code": return `\`${inner()}\``;
      case "a": return `[${inner()}](${node.getAttribute("href") ?? ""})`;
      case "blockquote": return `> ${inner().trim()}\n\n`;
      case "ul": return Array.from(node.children).map((li) => `- ${walk(li).trim()}\n`).join("") + "\n";
      case "ol": return Array.from(node.children).map((li, i) => `${i + 1}. ${walk(li).trim()}\n`).join("") + "\n";
      case "li": return inner();
      case "pre": return `\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
      case "hr": return `---\n\n`;
      case "br": return "\n";
      default: return inner();
    }
  };
  return walk(doc.body).replace(/\n{3,}/g, "\n\n").trim();
}

// ── Toggle switch component ───────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`toolbar-toggle ${on ? "toolbar-toggle-on" : ""}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={on}
    >
      <span className="toolbar-toggle-thumb" />
    </button>
  );
}

// ── Theme icon for current resolved theme ─────────────────────

function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  if (choice === "light") return <Sun size={15} />;
  if (choice === "dark") return <Moon size={15} />;
  return <Monitor size={15} />;
}

function nextTheme(current: ThemeChoice): ThemeChoice {
  const order: ThemeChoice[] = ["system", "dark", "light"];
  return order[(order.indexOf(current) + 1) % order.length];
}

function themeLabel(choice: ThemeChoice): string {
  if (choice === "system") return "Theme: System";
  if (choice === "light") return "Theme: Light";
  return "Theme: Dark";
}

// ── Main component ────────────────────────────────────────────

export default function PageToolbar({ onDelete }: PageToolbarProps) {
  const [open, setOpen] = useState<DropdownId>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [font, setFont] = useState<FontFamily>(() => loadPref("chit-font", "default"));
  const [smallText, setSmallText] = useState(() => String(loadPref("chit-small-text", "false")) === "true");
  const [fullWidth, setFullWidth] = useState(() => String(loadPref("chit-full-width", "false")) === "true");
  const [theme, setTheme] = useState<ThemeChoice>(() => loadPref("chit-theme", "system"));

  // Apply preferences to DOM
  useEffect(() => { applyToRoot("font", font); savePref("chit-font", font); }, [font]);
  useEffect(() => { applyToRoot("small-text", String(smallText)); savePref("chit-small-text", String(smallText)); }, [smallText]);
  useEffect(() => { applyToRoot("full-width", String(fullWidth)); savePref("chit-full-width", String(fullWidth)); }, [fullWidth]);
  useEffect(() => {
    applyToRoot("theme", resolveTheme(theme));
    savePref("chit-theme", theme);
  }, [theme]);

  // Listen to system theme changes when set to "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyToRoot("theme", resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => { close(); setToast(msg); };

  const exportTxt = () => {
    const title = getTitle();
    downloadFile(`${title}.txt`, `${title}\n\n${getEditorText()}`, "text/plain");
    showToast("Exported as .txt");
  };

  const exportMd = () => {
    const title = getTitle();
    downloadFile(`${title}.md`, `# ${title}\n\n${htmlToMarkdown(getEditorHTML())}`, "text/markdown");
    showToast("Exported as .md");
  };

  const exportPdf = () => { close(); window.print(); };

  const copyLink = () => { showToast("Coming soon"); };

  const wordCount = () => {
    const text = getEditorText().trim();
    const words = text ? text.split(/\s+/).length : 0;
    showToast(`${words} word${words === 1 ? "" : "s"}`);
  };

  return (
    <div className="page-toolbar" ref={toolbarRef}>
      {/* Export */}
      <div className="toolbar-dropdown-anchor">
        <button className="toolbar-btn" title="Export" onClick={() => setOpen(open === "export" ? null : "export")}>
          <Download size={16} />
        </button>
        {open === "export" && (
          <div className="toolbar-dropdown">
            <div className="toolbar-dropdown-header">
              <img src="/logo.png" alt="" className="toolbar-dropdown-icon" aria-hidden />
              <span>Export</span>
            </div>
            <button className="toolbar-dropdown-item" onClick={exportTxt}>
              <FileText size={15} /><span>Export as .txt</span>
            </button>
            <button className="toolbar-dropdown-item" onClick={exportMd}>
              <FileCode2 size={15} /><span>Export as .md</span>
            </button>
            <span className="toolbar-dropdown-hint">Re-import .md from the sidebar</span>
            <button className="toolbar-dropdown-item" onClick={exportPdf}>
              <FileDown size={15} /><span>Export as .pdf</span>
            </button>
            <div className="toolbar-dropdown-divider" />
            <button className="toolbar-dropdown-item" onClick={copyLink}>
              <Link size={15} /><span>Copy link</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete (beside export) */}
      {onDelete && (
        <button className="toolbar-btn" title="Move to trash" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      )}

      {/* More menu */}
      <div className="toolbar-dropdown-anchor">
        <button className="toolbar-btn" title="More" onClick={() => setOpen(open === "more" ? null : "more")}>
          <MoreHorizontal size={16} />
        </button>
        {open === "more" && (
          <div className="toolbar-dropdown toolbar-dropdown-wide">
            {/* Font picker */}
            <div className="font-picker">
              {(["default", "serif", "mono"] as FontFamily[]).map((f) => (
                <button
                  key={f}
                  className={`font-picker-btn ${font === f ? "font-picker-active" : ""}`}
                  onClick={() => setFont(f)}
                >
                  <span className={`font-picker-preview font-preview-${f}`}>Ag</span>
                  <span className="font-picker-label">{f === "default" ? "Default" : f === "serif" ? "Serif" : "Mono"}</span>
                </button>
              ))}
            </div>

            <div className="toolbar-dropdown-divider" />

            {/* Toggles */}
            <div className="toolbar-dropdown-toggle-item" onClick={() => setSmallText(!smallText)}>
              <span>Small text</span>
              <Toggle on={smallText} onToggle={() => setSmallText(!smallText)} />
            </div>
            <div className="toolbar-dropdown-toggle-item" onClick={() => setFullWidth(!fullWidth)}>
              <span>Full width</span>
              <Toggle on={fullWidth} onToggle={() => setFullWidth(!fullWidth)} />
            </div>

            <div className="toolbar-dropdown-divider" />

            {/* Theme cycle */}
            <button className="toolbar-dropdown-item" onClick={() => setTheme(nextTheme(theme))}>
              <ThemeIcon choice={theme} />
              <span>{themeLabel(theme)}</span>
            </button>

            <div className="toolbar-dropdown-divider" />

            <a
              className="toolbar-dropdown-item"
              href="https://github.com/Affan-sajid/chit"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
            >
              <Star size={15} /><span>Star on GitHub</span>
            </a>
            <button className="toolbar-dropdown-item" onClick={() => showToast("Chit+ coming soon")}>
              <Sparkles size={15} /><span>Chit+</span>
            </button>
            <button className="toolbar-dropdown-item" onClick={wordCount}>
              <LetterText size={15} /><span>Word count</span>
            </button>
            <button className="toolbar-dropdown-item" onClick={() => showToast("Shortcuts coming soon")}>
              <Keyboard size={15} /><span>Keyboard shortcuts</span>
            </button>
          </div>
        )}
      </div>

      {toast && <div className="toolbar-toast">{toast}</div>}
    </div>
  );
}
