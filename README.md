# Inkfeed

A simple reader for RSS and Atom feeds. Designed for e-ink browsers, but functional everywhere. No signup, no tracking — just your feeds, cleanly presented.

**Open the reader:** [https://reader.inkfeed.xyz](https://reader.inkfeed.xyz)

## Features

- **RSS 2.0 & Atom** — Parses both formats natively. Special handling for Reddit JSON feeds and Google News redirect URLs.
- **Clean reader view** — Fetches the full article body using Mozilla Readability, stripping ads and site chrome. Adjustable font, spacing, and line height (in Settings).
- **Download & send to Kindle** — Export articles as MOBI, EPUB, or plain text. Download or email individual articles or a selection from the feed to your Kindle.
- **Comments** — Fetches and displays Reddit and Hacker News comments. Included in MOBI downloads.
- **Save your feeds** — Feed URLs are persisted in browser local storage. No server, no account.
- **Suggested feeds** — Built-in curated list across tech, news, science, and more.
- **Built for e-ink** — No JavaScript frameworks, no heavy assets. Written in ES3 so it runs in the Kindle's experimental browser.

## How to use

1. Open the reader in any browser — desktop, phone, or Kindle.
2. Paste any RSS or Atom feed URL and hit **Load**, or pick from the suggested feeds list.
3. Click an article to read it. Use **Full Article** to extract the complete body from the source.
4. **Download** or **Email** individual articles, or select multiple from the feed at once.

## Export formats

| Format | Notes                                          |
| ------ | ---------------------------------------------- |
| MOBI   | Kindle-native. Includes comments if available. |
| EPUB   | Supports image embedding (backend mode).       |
| TXT    | Plain text.                                    |

## Server-side vs local mode

By default, article fetching and file conversion happen on the Inkfeed backend, which saves battery on the Kindle and enables email delivery. You can switch to fully local mode (CORS proxy + in-browser conversion) any time in Settings.

To receive files by email on a Kindle, add **export@sender.inkfeed.xyz** to your approved senders list.

## Running locally

No install required. Open `index.html` directly in a browser. External dependencies (Mozilla Readability, JSZip) load from CDN.

## Technical details

- Pure HTML/CSS/JavaScript — no build step, no npm, no transpilation.
- All JavaScript uses ES3 syntax for Kindle browser compatibility (no `let`/`const`, no arrow functions, no `fetch` — uses `XMLHttpRequest`).
- Custom MOBI writer ported from [MobiWriter](https://github.com/cafaxo/MobiWriter) (C++) to [pure JavaScript](https://github.com/adhamsalama/MobiWriterJS).
- CORS proxy is configurable in Settings. You can self-host [this proxy](https://github.com/adhamsalama/cors-proxy).

## Acknowledgments

Many thanks to [MobiWriter](https://github.com/cafaxo/MobiWriter) for implementing an HTML-to-MOBI conversion program in C++, which Claude Code was able to port to pure JavaScript. Several AI models failed to implement this from scratch — pointing Claude Code at the MobiWriter source and asking it to port it to JavaScript is what made it possible.

## License

AGPL-3.0
