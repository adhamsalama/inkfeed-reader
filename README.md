# Inkfeed

A simple RSS reader built for your Kindle. Load any feed, read articles, and download or email them as MOBI or EPUB.

Free & open source. **[Open the Reader](https://reader.inkfeed.xyz)**

## Structure

```
frontend/   — Zero-dependency ES3 JavaScript SPA (open index.html directly, no build step)
backend/    — Go REST API (feed parsing, article extraction, EPUB/MOBI generation, email delivery)
```

## Features

- **Clean reader view** — Extracts the full article body using Mozilla Readability, stripping ads and site chrome. Adjustable font, spacing, and line height.
- **Download & send to Kindle** — Export articles as MOBI, EPUB, or plain text. Download or email individual articles or a selection from the feed to your Kindle.
- **Save your feeds** — Save feed URLs and sync them across devices. Sign up to keep your feeds and preferences in sync wherever you read.
- **Feed archive** — Enable archiving on a saved feed and the server scrapes it hourly, storing articles so you can read back issues even when the original page is gone.
- **Feed groups** — Organise saved feeds into named groups. Load all articles from a group in one tap.
- **Favorites** — Star any article to save it for later, synced to your account.
- **RSS 2.0 & Atom** — Parses both formats natively. Special handling for Reddit JSON feeds and Google News redirect URLs.
- **Comments** — View threaded comments for Hacker News, Reddit, and Lobste.rs articles directly in the reader.
- **Wikipedia search** — Search Wikipedia and open any article inline.
- **Built for e-ink** — No JavaScript frameworks, no heavy assets. Written in ES3 so it runs in the Kindle's experimental browser.

## How to use

1. Open [reader.inkfeed.xyz](https://reader.inkfeed.xyz) in any browser — desktop, phone, or Kindle.
2. Paste any RSS or Atom feed URL and hit **Load**, or pick from the suggested feeds list.
3. Click an article to read it. Use **Full Article** to extract the complete body from the source.
4. **Download** or **Email** individual articles, or select multiple from the feed at once.

## Export formats

| Format | Notes |
|--------|-------|
| MOBI | Kindle-native. Includes comments if available. |
| EPUB | Supports image embedding (backend mode). |
| TXT | Plain text. |

## How it works

**Server-side (default):** Articles are fetched and converted on a server, then delivered to your device or sent straight to your Kindle email address. Add **export@sender.inkfeed.xyz** to your Kindle's approved senders list.

**Fully local (optional):** Everything runs in the browser via a CORS proxy. Files are assembled and downloaded directly on your device. Switch to this mode any time in Settings.

## Running locally

### Frontend

No install required. Open `frontend/index.html` directly in a browser. External dependencies (Mozilla Readability, JSZip) load from CDN.

### Backend

```bash
cd backend
cp .env.example .env   # configure environment variables
go run .               # starts on port 8080
```

See `backend/.env.example` for all available environment variables.

## Technical details

- Pure HTML/CSS/JavaScript — no build step, no npm, no transpilation.
- All JavaScript uses ES3 syntax for Kindle browser compatibility (no `let`/`const`, no arrow functions, no `fetch` — uses `XMLHttpRequest`).
- Custom MOBI writer ported from [MobiWriter](https://github.com/cafaxo/MobiWriter) (C++) to [pure JavaScript](https://github.com/adhamsalama/MobiWriterJS).
- CORS proxy is configurable in Settings. You can self-host [this proxy](https://github.com/adhamsalama/cors-proxy).

## Acknowledgments

Many thanks to [MobiWriter](https://github.com/cafaxo/MobiWriter) for implementing an HTML-to-MOBI conversion program in C++, which Claude Code was able to port to pure JavaScript. Several AI models failed to implement this from scratch — pointing Claude Code at the MobiWriter source and asking it to port it to JavaScript is what made it possible.

## License

AGPL-3.0
