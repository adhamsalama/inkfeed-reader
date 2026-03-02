// UI Controls for Font Size, Spacing, and Line Height

// Global functions (called from HTML onclick handlers)

function adjustFontSize(delta) {
    AppState.currentFontSize = Math.max(
        AppConfig.MIN_FONT_SIZE,
        Math.min(AppConfig.MAX_FONT_SIZE, AppState.currentFontSize + delta)
    );
    document.body.style.fontSize = AppState.currentFontSize + "px";
}

function adjustSpacing(delta) {
    AppState.currentLetterSpacing = Math.max(
        AppConfig.MIN_LETTER_SPACING,
        Math.min(AppConfig.MAX_LETTER_SPACING, AppState.currentLetterSpacing + delta)
    );
    document.body.style.letterSpacing = AppState.currentLetterSpacing + "px";
    document.body.style.wordSpacing = AppState.currentLetterSpacing * 2 + "px";
}

function adjustLineHeight(delta) {
    AppState.currentLineHeight = Math.max(
        AppConfig.MIN_LINE_HEIGHT,
        Math.min(AppConfig.MAX_LINE_HEIGHT, AppState.currentLineHeight + delta)
    );
    document.body.style.lineHeight = AppState.currentLineHeight;
}
