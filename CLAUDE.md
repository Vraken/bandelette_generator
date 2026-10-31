# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page web app for creating and printing A4 label strips ("bandelettes") — no build step, no dependencies, no framework. Open `index.html` directly in a browser to run it.

## Running the App

```bash
# Any local HTTP server works; e.g.:
python3 -m http.server 8080
# Then open http://localhost:8080
```

Alternatively, open `index.html` directly — all features work without a server.

## Architecture

Three files, no bundler:

- **`index.html`** — toolbar markup (layout buttons, font selector, action buttons) + a `#page-container` div where pages are injected dynamically.
- **`style.css`** — screen layout and `@media print` rules. The `.landscape-page-print` class on `<body>` switches print orientation. `.no-print` hides the toolbar during print.
- **`script.js`** — all logic, one `DOMContentLoaded` listener:
  - `currentData` (string[]) holds the label texts; `currentLayout`, `currentCount`, `currentIsLandscape` hold layout state.
  - `renderPages()` wipes `#page-container` and rebuilds pages by chunking `currentData` into groups of `currentCount`.
  - `createPage()` builds one `.a4-page` div with N `.editable-area` children (all `contenteditable`).
  - `autoFitText()` binary-searches for the largest font size that fits without overflow — called after render and on every `input` event.
  - Layout buttons call `setLayout(layoutClass, count, isLandscape)`.

## Layout Modes

| Button | CSS class | Items/page | Orientation |
|---|---|---|---|
| Pleine Page | `layout-full` | 1 | landscape |
| Tiers | `layout-thirds` | 3 | portrait |
| Moitiés | `layout-halves` | 2 | landscape |
| 8 Rectangles | `layout-eight` | 8 | portrait |
| 16 Rectangles | `layout-sixteen` | 16 | landscape |

## Key Constraints

- `autoFitText` uses `scrollHeight`/`clientHeight` comparison — the `.editable-area` elements must have explicit, fixed pixel dimensions in CSS or the binary search misbehaves.
- Print/PDF uses `window.print()` with a temporary `document.title` change to set the suggested filename — this is browser-dependent.
- `currentData` is not synced back when the user edits cells manually (noted as a known limitation in the code). Importing a new list overwrites all edits.
