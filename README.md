# Kindle RSS Reader

A single-page web application for reading RSS feeds on Kindle devices. Displays articles in a format optimized for Kindle's browser and supports downloading articles as MOBI files for offline reading.

**Try it:** [https://adhamsalama.github.io/simple-rss-reader](https://adhamsalama.github.io/simple-rss-reader)

## Features

- **RSS Feed Support** - Works with both RSS 2.0 and Atom feeds
- **Reading Controls** - Adjustable font size, letter/word spacing, and line height
- **Full Article Extraction** - Fetches complete article content from summary-only feeds using Mozilla Readability
- **MOBI Downloads** - Download articles as Kindle-native MOBI files
- **Comments Integration** - Includes Hacker News comments in downloaded MOBI files
- **Feed Persistence** - Saves feed URL in browser for easy reload
- **Kindle Browser Compatible** - Uses ES3 JavaScript for maximum compatibility

# Screenshots

![Main](./screenshots/main.png)

![Full Article](./screenshots/full_article.png)

## Usage

1. Open `index.html` in your Kindle's browser (or any web browser)
2. Enter an RSS feed URL (e.g., `https://news.ycombinator.com/rss`)
3. Click **Load Feed** or press Enter
4. Click any article title to read it
5. Use **Get Full Article** to extract the complete article from the source

### Reading Controls

- **A+ / A-** - Increase or decrease font size
- **Spacing +/-** - Adjust letter and word spacing
- **Line +/-** - Adjust line height

### Downloading Articles

- **Download** - Save article as plain text (.txt)
- **Download as MOBI** - Save as Kindle-compatible e-book with comments (if available)

## Technical Details

- Pure HTML/CSS/JavaScript with no build step required
- All JavaScript uses ES3 syntax for Kindle browser compatibility
- Custom MOBI file writer ported from [MobiWriter](https://github.com/cafaxo/MobiWriter) (C++) to [pure JavaScript](https://github.com/adhamsalama/MobiWriterJS)
- Uses CORS proxy (`cors-anywhere.com`) for cross-origin feed fetching
- Dependencies loaded from CDN:
  - Mozilla Readability for article extraction
  - JSZip for EPUB generation

## Supported Download Formats

The Kindle browser only supports downloading these file types:

- **MOBI** - Kindle native format (recommended)
- **TXT** - Plain text

## Installation

No installation required. Simply open `index.html` in a browser or host the file on any web server.

Note: after using free cors proxies for a while I get an auth error now, so I wrote my own [CORS proxy](https://github.com/adhamsalama/cors-proxy) that I deploy on my phone using Termux.

# Acknowledgments

Many thanks to [MobiWriter](https://github.com/cafaxo/MobiWriter) for implementing an HTML to MOBI conversion program in C++, which Claude Code was able to port to pure JavaScript. I tried to make several AI models implement an HTML to MOBI conversion, but they failed, until I pointed Claude Code to the MobiWriter implementation and asked it to port it to JavaScript, so this wasn't doable without your useful repo.

## License

MIT
