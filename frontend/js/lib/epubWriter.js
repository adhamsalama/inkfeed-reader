
/**
 * EpubWriter.js - ES3 JavaScript EPUB generator
 * Creates EPUB files from HTML content using JSZip
 *
 * Usage:
 *   var writer = new EpubWriter();
 *   writer.generate(article, articleHtml, commentsHtml);
 *   // triggers download in browser
 */

(function(global) {
  "use strict";

  // ============================================================
  // EpubWriter Constructor
  // ============================================================

  function EpubWriter() {}

  // ============================================================
  // Private Helper Functions
  // ============================================================

  function buildXhtmlContent(title, articleHtml, commentsHtml) {
    var xhtmlParts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE html>',
      '<html xmlns="http://www.w3.org/1999/xhtml">',
      '<head><title>',
      escapeHtml(title),
      '</title></head>',
      '<body>',
      '<h1>',
      escapeHtml(title),
      '</h1>',
      articleHtml
    ];

    if (commentsHtml) {
      xhtmlParts.push('<hr/>');
      xhtmlParts.push('<h2>Comments</h2>');
      xhtmlParts.push(commentsHtml);
    }

    xhtmlParts.push('</body></html>');
    return xhtmlParts.join("");
  }

  function buildOpfContent(title) {
    var opfParts = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">',
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
      '<dc:title>',
      escapeHtml(title),
      '</dc:title>',
      '<dc:language>en</dc:language>',
      '<dc:identifier id="BookId">urn:uuid:',
      Date.now().toString(16),
      '</dc:identifier>',
      '<meta property="dcterms:modified">',
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      '</meta>',
      '</metadata>',
      '<manifest>',
      '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>',
      '</manifest>',
      '<spine>',
      '<itemref idref="content"/>',
      '</spine>',
      '</package>'
    ];
    return opfParts.join("");
  }

  function getContainerXml() {
    return '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  }

  // ============================================================
  // Public Methods
  // ============================================================

  EpubWriter.prototype.generate = function(article, articleHtml, commentsHtml) {
    var title = article.title || "Article";
    var filename = title.replace(/[^a-z0-9]/gi, "_") + ".epub";

    var xhtmlContent = buildXhtmlContent(title, articleHtml, commentsHtml);
    var opfContent = buildOpfContent(title);
    var containerXml = getContainerXml();

    try {
      var zip = new JSZip();

      // Mimetype must be first and uncompressed
      zip.file("mimetype", "application/epub+zip", {compression: "STORE"});
      zip.file("META-INF/container.xml", containerXml);
      zip.file("OEBPS/content.opf", opfContent);
      zip.file("OEBPS/content.xhtml", xhtmlContent);

      zip.generateAsync({type: "blob", mimeType: "application/epub+zip"}).then(
        function (blob) {
          if (!downloadBlob(blob, filename)) {
            alert("EPUB download not supported in this browser");
          }
        },
        function (err) {
          alert("Error generating EPUB: " + err.message);
        }
      );
    } catch (e) {
      alert("Error generating EPUB: " + e.message);
    }
  };

  EpubWriter.prototype.generateAndGetBlob = function(article, articleHtml, commentsHtml, callback) {
    var title = article.title || "Article";
    var filename = title.replace(/[^a-z0-9]/gi, "_") + ".epub";

    var xhtmlContent = buildXhtmlContent(title, articleHtml, commentsHtml);
    var opfContent = buildOpfContent(title);
    var containerXml = getContainerXml();

    try {
      var zip = new JSZip();
      zip.file("mimetype", "application/epub+zip", {compression: "STORE"});
      zip.file("META-INF/container.xml", containerXml);
      zip.file("OEBPS/content.opf", opfContent);
      zip.file("OEBPS/content.xhtml", xhtmlContent);

      zip.generateAsync({type: "blob", mimeType: "application/epub+zip"}).then(
        function(blob) { callback(null, blob, filename); },
        function(err) { callback(err, null, null); }
      );
    } catch (e) {
      callback(e, null, null);
    }
  };

  // ============================================================
  // Export to global scope
  // ============================================================

  global.EpubWriter = EpubWriter;
})(typeof window !== "undefined" ? window : this);
