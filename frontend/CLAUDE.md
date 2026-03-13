# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-dependency, vanilla ES3 JavaScript RSS reader designed for Kindle browsers but functional in any browser. No build step, no npm, no transpilation — open `index.html` directly.

Live deployment: https://adhamsalama.github.io/simple-rss-reader

## Running

Open `index.html` in a browser. No server, no build process required. All external dependencies (Mozilla Readability, JSZip) load from CDN.

## Architecture

Three-view single-page app with global state:

- **`#input-view`** — Feed URL entry and saved feeds list
- **`#feed-view`** — Article list from loaded feed
- **`#article-view`** — Individual article content

### Module Load Order (enforced by script tags in `index.html`)

```
lib/ → core/ → utils/ → ui/ → articles/ → downloads/ → feeds/ → app.js
```

### Key Data Flow

1. User enters RSS URL → `feedLoader.js` fetches XML via CORS proxy → parses RSS 2.0 or Atom
2. Article list rendered by `feedRenderer.js`
3. Click article → `articleViewer.js` shows feed summary
4. "Get Full Article" → `articleFetcher.js` fetches full HTML, extracts with Mozilla Readability
5. Download → `mobiDownloader.js` / `epubDownloader.js` / `textDownloader.js`

### Global State

- **`js/core/config.js`** — Constants: CORS proxy URL, font size bounds, retry config, comment limits
- **`js/core/state.js`** — Runtime state: `AppState` (font/spacing/lineHeight/currentArticles), `ArticleSelectionState` (bulk download selection)

### Special Handling

- **Reddit**: Detects Reddit feed URLs, uses `.json` API endpoint directly
- **Google News**: `googleNewsDecoder.js` decodes redirect URLs to actual article links
- **Comments**: Fetches Hacker News comments and includes them in MOBI downloads
- **CORS Proxy**: All external fetches go through a configurable proxy (default in `config.js`, overridable via UI)

### Persistence

All persistence is `localStorage`: saved feed URLs, display settings (font size, spacing, line height).

## ES3 Compatibility Constraint

The codebase must use **ES3-compatible JavaScript** throughout for Kindle browser support. This means:
- No `let`/`const` — use `var`
- No arrow functions, template literals, destructuring, spread, `class`, `Promise`, `fetch`
- Use `XMLHttpRequest` instead of `fetch`
- Use `DOMParser` with ActiveXObject fallback for IE

All modules use IIFE pattern (`(function() { ... })()`) for encapsulation.
