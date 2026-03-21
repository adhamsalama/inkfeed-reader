// Global Application State
var AppState = {
    currentFontSize: 16,
    currentLetterSpacing: 0,
    currentLineHeight: 1.5,
    currentArticles: [],
    currentArticleIndex: -1,
    currentArticleUrl: "",
    pendingScrollTarget: "",
    readArticles: new Set()
};

// Article selection state
var ArticleSelectionState = {
    downloadType: null,  // 'text' or 'mobi'
    selectedIndices: new Set(),
    inSelectionMode: false
};
