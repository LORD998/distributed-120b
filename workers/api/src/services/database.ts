import type { Conversation, DistributedNode, Env, MessageRow } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** Cria uma conversa. Aceita um id explícito (ex.: gerado no cliente) ou gera um novo. */
export async function createConversation(
  env: Env,
  title: string,
  userId = 'anonymous',
  id?: string,
): Promise<Conversation> {
  const conversationId = id ?? generateId('conv');
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(conversationId, userId, title, now, now)
    .run();
  return { id: conversationId, title, created_at: now, updated_at: now };
}

/** Verifica se uma conversa já existe (sem carregar mensagens). */
export async function conversationExists(env: Env, id: string): Promise<boolean> {
  const res = await env.DB.prepare(`SELECT 1 FROM conversations WHERE id = ?`).bind(id).first();
  return res !== null;
}

/** Lista conversas de um utilizador (mais recentes primeiro). */
export async function listConversations(env: Env, userId = 'anonymous'): Promise<Conversation[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 100`,
  )
    .bind(userId)
    .all();
  return results as unknown as Conversation[];
}

/** Devolve uma conversa com as mensagens. */
export async function getConversationWithMessages(
  env: Env,
  id: string,
): Promise<{ conversation: Conversation | null; messages: MessageRow[] }> {
  const convRes = await env.DB.prepare(
    `SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?`,
  )
    .bind(id)
    .first();
  const conversation = (convRes as unknown as Conversation) ?? null;

  const { results } = await env.DB.prepare(
    `SELECT id, conversation_id, role, content, model, backend, created_at
     FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC`,
  )
    .bind(id)
    .all();
  const messages = results as unknown as MessageRow[];

  return { conversation, messages };
}

/** Renomeia uma conversa. */
export async function renameConversation(env: Env, id: string, title: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(title, nowIso(), id)
    .run();
}

/** Elimina uma conversa (mensagens em cascata). */
export async function deleteConversation(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM conversations WHERE id = ?`).bind(id).run();
}

/** Guarda uma mensagem. */
export async function insertMessage(
  env: Env,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  model?: string,
  backend?: string,
): Promise<MessageRow> {
  const id = generateId('msg');
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, model, backend, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, conversationId, role, content, model ?? null, backend ?? null, now)
    .run();

  // Atualiza o timestamp da conversa
  await env.DB.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`)
    .bind(now, conversationId)
    .run();

  return { id, conversation_id: conversationId, role, content, model, backend, created_at: now };
}

/** Regista um pedido na tabela requests. */
export async function insertRequest(
  env: Env,
  data: {
    id: string;
    conversationId?: string;
    status: string;
    backend?: string;
    cacheHit: boolean;
    latencyMs?: number;
    totalTimeMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO requests (
       id, conversation_id, status, backend, cache_hit, latency_ms,
       total_time_ms, input_tokens, output_tokens, error_message, created_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      data.id,
      data.conversationId ?? null,
      data.status,
      data.backend ?? null,
      data.cacheHit ? 1 : 0,
      data.latencyMs ?? null,
      data.totalTimeMs ?? null,
      data.inputTokens ?? null,
      data.outputTokens ?? null,
      data.errorMessage ?? null,
      now,
      data.status === 'completed' ? now : null,
    )
    .run();
}

/** Devolve um nó distribuído saudável (Fase 2). Já preparado para GPU voluntárias. */
export async function findHealthyDistributedNode(
  env: Env,
): Promise<DistributedNode | null> {
  const timeoutMs = 120_000;
  const cutoff = new Date(Date.now() - timeoutMs).toISOString();

  const res = await env.DB.prepare(
    `SELECT id, name, endpoint, region, gpu_model, vram_gb, status, last_heartbeat
     FROM inference_nodes
     WHERE status IN ('healthy', 'online') AND last_heartbeat > ?
     ORDER BY last_heartbeat DESC
     LIMIT 1`,
  )
    .bind(cutoff)
    .first();

  if (!res) return null;
  return res as unknown as DistributedNode;
}
