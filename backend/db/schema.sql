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
    email_to          TEXT,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_saved_feeds (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES users(id),
    url      TEXT    NOT NULL,
    title    TEXT    NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_feed_groups (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES users(id),
    name     TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_feed_group_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES user_feed_groups(id),
    url      TEXT NOT NULL,
    title    TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS persistent_cache (
    key          TEXT     PRIMARY KEY,
    body         TEXT     NOT NULL,
    content_type TEXT     NOT NULL,
    expires_at   DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  NOT NULL REFERENCES users(id),
    url        TEXT     NOT NULL,
    title      TEXT     NOT NULL DEFAULT '',
    feed_title TEXT     NOT NULL DEFAULT '',
    pub_date     TEXT     NOT NULL DEFAULT '',
    comments_url TEXT     NOT NULL DEFAULT '',
    saved_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
