CREATE TABLE IF NOT EXISTS authorized_tokens (
    token TEXT PRIMARY KEY,
    volunteer_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);
