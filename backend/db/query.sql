-- name: CreateUser :one
INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = ? LIMIT 1;

-- name: CreateSession :exec
INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?);

-- name: GetSession :one
SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token = ?;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = ? LIMIT 1;

-- name: GetUserPreferences :one
SELECT font_size, letter_spacing, line_height, cors_proxy_url, epub_embed_images, email_to
FROM user_preferences WHERE user_id = ? LIMIT 1;

-- name: UpsertUserPreferences :exec
INSERT INTO user_preferences (user_id, font_size, letter_spacing, line_height, cors_proxy_url, epub_embed_images, email_to, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id) DO UPDATE SET
    font_size = excluded.font_size,
    letter_spacing = excluded.letter_spacing,
    line_height = excluded.line_height,
    cors_proxy_url = excluded.cors_proxy_url,
    epub_embed_images = excluded.epub_embed_images,
    email_to = excluded.email_to,
    updated_at = CURRENT_TIMESTAMP;

-- name: GetUserSavedFeeds :many
SELECT url, title FROM user_saved_feeds WHERE user_id = ? ORDER BY position;

-- name: DeleteUserSavedFeeds :exec
DELETE FROM user_saved_feeds WHERE user_id = ?;

-- name: InsertUserSavedFeed :exec
INSERT INTO user_saved_feeds (user_id, url, title, position) VALUES (?, ?, ?, ?);

-- name: GetUserFeedGroups :many
SELECT id, name FROM user_feed_groups WHERE user_id = ? ORDER BY position;

-- name: GetFeedGroupItems :many
SELECT url, title FROM user_feed_group_items WHERE group_id = ? ORDER BY position;

-- name: DeleteUserFeedGroupItems :exec
DELETE FROM user_feed_group_items WHERE group_id IN (SELECT id FROM user_feed_groups WHERE user_id = ?);

-- name: DeleteUserFeedGroups :exec
DELETE FROM user_feed_groups WHERE user_id = ?;

-- name: InsertFeedGroup :one
INSERT INTO user_feed_groups (user_id, name, position) VALUES (?, ?, ?) RETURNING id;

-- name: InsertFeedGroupItem :exec
INSERT INTO user_feed_group_items (group_id, url, title, position) VALUES (?, ?, ?, ?);

-- name: GetPersistentCache :one
SELECT body, content_type FROM persistent_cache WHERE key = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1;

-- name: SetPersistentCache :exec
INSERT INTO persistent_cache (key, body, content_type, expires_at) VALUES (?, ?, ?, ?)
ON CONFLICT(key) DO UPDATE SET body = excluded.body, content_type = excluded.content_type, expires_at = excluded.expires_at;

-- name: GetUserFavorites :many
SELECT url, title, feed_title, pub_date, comments_url FROM user_favorites WHERE user_id = ? ORDER BY saved_at DESC;

-- name: DeleteAllUserFavorites :exec
DELETE FROM user_favorites WHERE user_id = ?;

-- name: InsertUserFavorite :exec
INSERT INTO user_favorites (user_id, url, title, feed_title, pub_date, comments_url) VALUES (?, ?, ?, ?, ?, ?);
