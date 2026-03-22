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
