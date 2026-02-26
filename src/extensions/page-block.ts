import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import React from "react";
import PageBlockView from "../components/page-block-view";

export const PageBlock = Node.create({
  name: "pageBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      pageId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-page-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-page-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      (props: ReactNodeViewProps<HTMLElement>) =>
        React.createElement(PageBlockView, {
          node: {
            attrs: {
              pageId: String((props.node.attrs as { pageId?: string | null }).pageId ?? ""),
            },
          },
        })
    );
  },
});
