// EPUB Downloader

var EpubDownloader = {
    generateAndDownloadEpub: function(article, articleHtml, commentsHtml) {
        var writer = new EpubWriter();
        writer.generate(article, articleHtml, commentsHtml);
    }
};
