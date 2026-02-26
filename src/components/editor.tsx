import { useMemo, useEffect, useRef, useCallback } from "react";
import {
  Command,
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  handleCommandNavigation,
  renderItems,
  useEditor,
} from "novel";
import { generateJSON } from "@tiptap/core";
import { baseExtensions } from "../extensions";
import { baseSuggestionItems, createPageItem } from "../suggestion-items";
import { ABOUT_ID } from "../storage";

const STORAGE_PREFIX = "chit-page-";

function AutoSave({ pageId, onEdited }: { pageId: string; onEdited?: () => void }) {
  const { editor } = useEditor();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(() => {
    if (!editor) return;
    // Do not persist About Chit edits; they are reset on reload
    if (pageId === ABOUT_ID) return;
    localStorage.setItem(STORAGE_PREFIX + pageId, editor.getHTML());
  }, [editor, pageId]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      onEdited?.();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(save, 500);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      clearTimeout(timerRef.current);
      save();
    };
  }, [editor, save, onEdited]);

  return null;
}

function FocusBodyOnMount({ focus }: { focus: boolean }) {
  const { editor } = useEditor();
  useEffect(() => {
    if (!focus || !editor) return;
    const timer = requestAnimationFrame(() => {
      editor.commands.focus("start");
    });
    return () => cancelAnimationFrame(timer);
  }, [focus, editor]);
  return null;
}

function BubbleMenuButtons() {
  const { editor } = useEditor();
  if (!editor) return null;

  return (
    <div className="bubble-menu">
      <EditorBubbleItem
        onSelect={(e) => e.chain().focus().toggleBold().run()}
        className="bubble-btn"
      >
        <span style={{ fontWeight: 700 }}>B</span>
      </EditorBubbleItem>
      <EditorBubbleItem
        onSelect={(e) => e.chain().focus().toggleItalic().run()}
        className="bubble-btn"
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </EditorBubbleItem>
      <EditorBubbleItem
        onSelect={(e) => e.chain().focus().toggleUnderline?.().run()}
        className="bubble-btn"
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </EditorBubbleItem>
      <EditorBubbleItem
        onSelect={(e) => e.chain().focus().toggleStrike().run()}
        className="bubble-btn"
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </EditorBubbleItem>
      <EditorBubbleItem
        onSelect={(e) => e.chain().focus().toggleCode().run()}
        className="bubble-btn"
      >
        <span style={{ fontFamily: "monospace", fontSize: "0.8em" }}>{"`"}</span>
      </EditorBubbleItem>
    </div>
  );
}

interface EditorProps {
  onCreateSubPage: (parentId: string) => string;
  activePageId: string;
  childPageIds: string[];
  onEdited?: () => void;
  focusBodyOnMount?: boolean;
  registerFocus?: (focus: () => void) => void;
}

function RegisterFocus({ registerFocus }: { registerFocus?: (focus: () => void) => void }) {
  const { editor } = useEditor();
  useEffect(() => {
    if (!editor || !registerFocus) return;
    registerFocus(() => editor.commands.focus("start"));
  }, [editor, registerFocus]);
  return null;
}

export default function Editor({ onCreateSubPage, activePageId, childPageIds, onEdited, focusBodyOnMount, registerFocus }: EditorProps) {
  const allItems = useMemo(() => {
    const pageItem = createPageItem(onCreateSubPage, activePageId);
    return [...baseSuggestionItems, pageItem];
  }, [onCreateSubPage, activePageId]);

  const extensions = useMemo(() => {
    const slashCommand = Command.configure({
      suggestion: {
        items: () => allItems,
        render: renderItems,
      },
    });
    return [...baseExtensions, slashCommand];
  }, [allItems]);

  const initialContent = useMemo(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + activePageId);
    if (saved) {
      try {
        return generateJSON(saved, extensions);
      } catch { /* fall through */ }
    }
    if (childPageIds.length === 0) return undefined;
    return {
      type: "doc" as const,
      content: [
        ...childPageIds.map((id) => ({
          type: "pageBlock" as const,
          attrs: { pageId: id },
        })),
        { type: "paragraph" as const },
      ],
    };
  }, [activePageId, childPageIds, extensions]);

  return (
    <EditorRoot>
      <EditorContent
        extensions={extensions}
        initialContent={initialContent}
        editorProps={{
          handleDOMEvents: {
            keydown: (_view, event) => handleCommandNavigation(event),
          },
          attributes: {
            class: "focus:outline-none",
          },
        }}
      >
        <EditorCommand className="slash-menu w-72">
          <div className="slash-menu-label">Blocks</div>
          <EditorCommandEmpty className="slash-menu-empty">
            No results
          </EditorCommandEmpty>
          <EditorCommandList className="slash-menu-list">
            {allItems.map((item) => (
              <EditorCommandItem
                key={item.title}
                value={item.title}
                onCommand={(val) => item.command?.(val)}
                className="slash-menu-item"
              >
                <div className="slash-menu-icon">{item.icon}</div>
                <div className="slash-menu-text">
                  <div className="slash-menu-title">{item.title}</div>
                  <div className="slash-menu-desc">{item.description}</div>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
          <div className="slash-menu-footer">
            <span>Close menu</span>
            <kbd>esc</kbd>
          </div>
        </EditorCommand>

        <EditorBubble tippyOptions={{ placement: "top" }}>
          <BubbleMenuButtons />
        </EditorBubble>

        <FocusBodyOnMount focus={focusBodyOnMount === true} />
        <RegisterFocus registerFocus={registerFocus} />
        <AutoSave pageId={activePageId} onEdited={onEdited} />
      </EditorContent>
    </EditorRoot>
  );
}
