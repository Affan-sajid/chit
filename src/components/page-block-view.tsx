import { NodeViewWrapper } from "@tiptap/react";
import { useContext } from "react";
import { PageContext } from "../context/page-context";

export default function PageBlockView({ node }: { node: { attrs: { pageId: string } } }) {
  const { pages, navigate } = useContext(PageContext);
  const page = pages.find((p) => p.id === node.attrs.pageId);

  return (
    <NodeViewWrapper>
      <div
        className="page-block-card"
        onClick={() => navigate(node.attrs.pageId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") navigate(node.attrs.pageId);
        }}
      >
        {page?.icon ? (
          <span className="page-block-emoji">{page.icon}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="page-block-doc-icon">
            <path
              d="M4.5 2h5l3.5 3.5V13a1 1 0 01-1 1h-7.5a1 1 0 01-1-1V3a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.1"
            />
          </svg>
        )}
        <span className="page-block-title">{page?.title || "Untitled"}</span>
      </div>
    </NodeViewWrapper>
  );
}
