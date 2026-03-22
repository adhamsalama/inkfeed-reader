CREATE TABLE IF NOT EXISTS users (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    email         TEXT     NOT NULL UNIQUE,
    password_hash TEXT     NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL REFERENCES users(id),
    expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id           INTEGER PRIMARY KEY REFERENCES users(id),
    font_size         REAL,
    letter_spacing    REAL,
    line_height       REAL,
    cors_proxy_url    TEXT,
    epub_embed_images INTEGER,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_saved_feeds (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES users(id),
    url      TEXT    NOT NULL,
    title    TEXT    NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);
