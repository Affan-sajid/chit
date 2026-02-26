import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

const BLOCK_IN_SELECTION_CLASS = "ProseMirror-block-in-selection";

function rangesOverlap(
  from1: number,
  to1: number,
  from2: number,
  to2: number
): boolean {
  return from1 < to2 && from2 < to1;
}

function isBlockNode(node: PMNode): boolean {
  return node.type.isBlock && node.type.name !== "doc";
}

/**
 * Build decorations for every block node that intersects the current text selection,
 * so multi-block text selection can be styled as "boxes" (via .ProseMirror-block-in-selection).
 */
function blockSelectionDecorations(state: EditorState): DecorationSet {
  const { selection, doc } = state;
  if (!(selection instanceof TextSelection) || selection.empty) {
    return DecorationSet.empty;
  }
  const from = selection.from;
  const to = selection.to;
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!isBlockNode(node)) return;
    const blockEnd = pos + node.nodeSize;
    if (rangesOverlap(from, to, pos, blockEnd)) {
      decos.push(Decoration.node(pos, blockEnd, { class: BLOCK_IN_SELECTION_CLASS }));
    }
  });
  return DecorationSet.create(doc, decos);
}

const blockSelectionPluginKey = new PluginKey("multiBlockSelection");

/**
 * Gutter selection: drag in the left margin to select multiple blocks.
 * We treat the left GUTTER_PX of the editor as the "gutter"; mousedown + mousemove there
 * sets selection to span from the block under start to the block under current.
 */
const GUTTER_PX = 28;

function getEditorRect(view: EditorView): DOMRect | null {
  const el = view.dom.closest(".ProseMirror");
  return el ? (el as Element).getBoundingClientRect() : null;
}

function isInGutter(view: EditorView, clientX: number): boolean {
  const rect = getEditorRect(view);
  if (!rect) return false;
  const localX = clientX - rect.left;
  return localX >= 0 && localX < GUTTER_PX;
}

function blockStartAtPos(doc: PMNode, pos: number): number {
  const $ = doc.resolve(pos);
  const depth = $.depth;
  for (let d = depth; d > 0; d--) {
    const node = $.node(d);
    if (node.type.isBlock && node.type.name !== "doc") {
      return $.before(d);
    }
  }
  return 0;
}

function blockEndAtPos(doc: PMNode, pos: number): number {
  const $ = doc.resolve(pos);
  const depth = $.depth;
  for (let d = depth; d > 0; d--) {
    const node = $.node(d);
    if (node.type.isBlock && node.type.name !== "doc") {
      return $.after(d);
    }
  }
  return doc.content.size;
}

export const MultiBlockSelection = Extension.create({
  name: "multiBlockSelection",

  addProseMirrorPlugins() {
    return [
      // 1) Decorations: mark blocks inside text selection so they can be styled as boxes
      new Plugin({
        key: blockSelectionPluginKey,
        state: {
          init(_, state) {
            return blockSelectionDecorations(state);
          },
          apply(tr, oldDecos, _oldState, newState) {
            if (tr.selectionSet || tr.docChanged) {
              return blockSelectionDecorations(newState);
            }
            return oldDecos.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return blockSelectionPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),

      // 2) Gutter selection: drag from left margin to select multiple blocks
      new Plugin({
        key: new PluginKey("gutterBlockSelection"),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              if (!view.editable || !isInGutter(view, event.clientX)) return;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (pos == null) return;
              const doc = view.state.doc;
              const anchorBlockStart = blockStartAtPos(doc, pos.pos);
              const anchorBlockEnd = blockEndAtPos(doc, pos.pos);
              const selection = TextSelection.create(doc, anchorBlockStart, anchorBlockEnd);
              view.dispatch(view.state.tr.setSelection(selection));

              const onMouseMove = (e: MouseEvent) => {
                const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
                if (coords == null) return;
                const currentBlockStart = blockStartAtPos(view.state.doc, coords.pos);
                const currentBlockEnd = blockEndAtPos(view.state.doc, coords.pos);
                const from = Math.min(anchorBlockStart, currentBlockStart);
                const to = Math.max(anchorBlockEnd, currentBlockEnd);
                const sel = TextSelection.create(view.state.doc, from, to);
                if (sel.from !== view.state.selection.from || sel.to !== view.state.selection.to) {
                  view.dispatch(view.state.tr.setSelection(sel));
                }
              };

              const onMouseUp = () => {
                view.dom.ownerDocument.removeEventListener("mousemove", onMouseMove);
                view.dom.ownerDocument.removeEventListener("mouseup", onMouseUp);
              };

              view.dom.ownerDocument.addEventListener("mousemove", onMouseMove);
              view.dom.ownerDocument.addEventListener("mouseup", onMouseUp);
              event.preventDefault();
            },
          },
        },
      }),
    ];
  },
});
