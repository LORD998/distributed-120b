import type { Conversation, Env, MessageRow } from '../types';
import {
  deleteConversation,
  getConversationWithMessages,
  listConversations,
  renameConversation,
} from '../services/database';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// A base de dados usa snake_case (created_at/updated_at); o contrato da API
// e o frontend usam camelCase — converte na fronteira da rota.
function toConversationJson(c: Conversation) {
  return { id: c.id, title: c.title, createdAt: c.created_at, updatedAt: c.updated_at };
}

function toMessageJson(m: MessageRow) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    model: m.model,
    backend: m.backend,
    createdAt: m.created_at,
  };
}

export async function handleConversations(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /v1/conversations — lista
  if (path === '/v1/conversations' && request.method === 'GET') {
    try {
      const conversations = await listConversations(env);
      return json({ conversations: conversations.map(toConversationJson) });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Erro ao listar conversas' }, 500);
    }
  }

  // Rota por id
  const match = path.match(/^\/v1\/conversations\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);

    // GET /v1/conversations/{id} — carrega com mensagens
    if (request.method === 'GET') {
      try {
        const data = await getConversationWithMessages(env, id);
        if (!data.conversation) {
          return json({ error: 'Conversa não encontrada' }, 404);
        }
        return json({
          conversation: toConversationJson(data.conversation),
          messages: data.messages.map(toMessageJson),
        });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Erro ao carregar conversa' }, 500);
      }
    }

    // PUT /v1/conversations/{id} — renomear
    if (request.method === 'PUT') {
      try {
        const body = (await request.json()) as { title?: string };
        const title = body.title?.trim();
        if (!title) return json({ error: 'Título vazio' }, 400);
        await renameConversation(env, id, title);
        const data = await getConversationWithMessages(env, id);
        if (!data.conversation) {
          return json({ error: 'Conversa não encontrada' }, 404);
        }
        return json({ conversation: toConversationJson(data.conversation) });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Erro ao renomear' }, 500);
      }
    }

    // DELETE /v1/conversations/{id} — eliminar
    if (request.method === 'DELETE') {
      try {
        await deleteConversation(env, id);
        return json({ ok: true });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Erro ao eliminar' }, 500);
      }
    }
  }

  return json({ error: 'Não encontrado' }, 404);
}