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
SELECT font_size, letter_spacing, line_height, cors_proxy_url, epub_embed_images
FROM user_preferences WHERE user_id = ? LIMIT 1;

-- name: UpsertUserPreferences :exec
INSERT INTO user_preferences (user_id, font_size, letter_spacing, line_height, cors_proxy_url, epub_embed_images, updated_at)
VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT(user_id) DO UPDATE SET
    font_size = excluded.font_size,
    letter_spacing = excluded.letter_spacing,
    line_height = excluded.line_height,
    cors_proxy_url = excluded.cors_proxy_url,
    epub_embed_images = excluded.epub_embed_images,
    updated_at = CURRENT_TIMESTAMP;

-- name: GetUserSavedFeeds :many
SELECT url, title FROM user_saved_feeds WHERE user_id = ? ORDER BY position;

-- name: DeleteUserSavedFeeds :exec
DELETE FROM user_saved_feeds WHERE user_id = ?;

-- name: InsertUserSavedFeed :exec
INSERT INTO user_saved_feeds (user_id, url, title, position) VALUES (?, ?, ?, ?);
