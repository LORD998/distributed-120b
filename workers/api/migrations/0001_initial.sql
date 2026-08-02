-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON conversations (user_id, updated_at DESC);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    backend TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at ASC);

-- Tabela de pedidos (métricas)
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    status TEXT NOT NULL,
    backend TEXT,
    cache_hit INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    total_time_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_created
    ON requests (created_at DESC);

-- Tabela de nós distribuídos (Fase 2 — GPU voluntárias)
CREATE TABLE IF NOT EXISTS inference_nodes (
    id TEXT PRIMARY KEY,
    name TEXT,
    endpoint TEXT,
    region TEXT,
    gpu_model TEXT,
    vram_gb INTEGER,
    status TEXT NOT NULL DEFAULT 'unknown',
    last_heartbeat TEXT
);

CREATE INDEX IF NOT EXISTS idx_inference_nodes_status
    ON inference_nodes (status, last_heartbeat DESC);