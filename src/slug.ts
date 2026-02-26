/** Minimal type for slug uniqueness; avoids importing storage (cycle). */
type PageWithSlug = { id: string; slug: string };

/**
 * Normalize a title for use as URL slug: trim, lowercase, spaces → _, collapse/sanitize.
 */
export function titleToSlug(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return s || "untitled";
}

/**
 * Return a slug that is unique among pages. If slug is empty, use "untitled".
 * Append _2, _3, ... when the slug is already taken (optionally excluding one page by id).
 */
export function ensureUniqueSlug(
  slug: string,
  pages: PageWithSlug[],
  excludeId?: string
): string {
  const base = (slug || "untitled").trim().toLowerCase().replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "untitled";
  const taken = new Set(
    pages.filter((p) => p.id !== excludeId).map((p) => p.slug)
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
