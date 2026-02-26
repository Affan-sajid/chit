# Chit

**Chit** is an open-source, local-first note-taking app. Create pages, use a rich editor with markdown, organize with a sidebar, and keep everything in your browser.

- **Local-first** — Data lives in your browser (no account required).
- **Rich editing** — Built with [Novel](https://novel.sh/) and markdown support.
- **Pages & sidebar** — Organize notes in a simple page tree.
- **Emoji** — Pick emoji for pages via [Emoji Mart](https://github.com/missive/emoji-mart).

---

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Novel](https://novel.sh/) (TipTap-based editor)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/) icons

---

## Getting started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Contributing

Chit is open source and we welcome contributions.

### How to contribute

1. **Fork** the repo and clone it locally.
2. **Create a branch** for your change: `git checkout -b fix/thing` or `git checkout -b feat/thing`.
3. **Make your changes** — keep them focused and follow existing code style.
4. **Run checks**: `npm run lint` (and fix any issues).
5. **Commit** with clear messages (e.g. `fix: typo in sidebar`, `feat: add export`).
6. **Push** your branch and open a **Pull Request** against the default branch.
7. Describe what you changed and why; link any related issues if applicable.

### Standards

- Follow the existing TypeScript and React patterns in the codebase.
- Prefer small, reviewable PRs over large ones.
- Be respectful and constructive in discussions.

---

## Attribution

### Dependencies & assets

This project uses and thanks the following:

- **[Novel](https://github.com/steven-tey/novel)** — Notion-style WYSIWYG editor (MIT).
- **[Emoji Mart](https://github.com/missive/emoji-mart)** — Emoji picker (BSD-3-Clause).
- **[marked](https://github.com/markedjs/marked)** — Markdown parser (MIT).
- **[Lucide](https://github.com/lucide-icons/lucide)** — Icons (ISC).
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)** — Styling (MIT).
- **[Vite](https://github.com/vitejs/vite)** — Build tool (MIT).
- **[React](https://github.com/facebook/react)** — UI library (MIT).

Licenses for each dependency are in their respective packages; run `npm licenses` to list them.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
