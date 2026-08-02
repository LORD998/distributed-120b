import type { Env } from '../types';
import { encodeSSE, makeSender } from '../backends/backend';
import { selectBackend } from '../services/router';
import { getCachedResponse, setCachedResponse, checkRateLimit } from '../services/cache';
import {
  conversationExists,
  createConversation,
  insertMessage,
  insertRequest,
} from '../services/database';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const maxOutputTokens = typeof body.max_output_tokens === 'number' ? body.max_output_tokens : 512;

  // Validação
  if (!message) {
    return json({ error: 'Mensagem vazia' }, 400);
  }
  const maxLen = Number(env.MAX_MESSAGE_LENGTH ?? 4000);
  if (message.length > maxLen) {
    return json({ error: `Mensagem demasiado longa (máx ${maxLen} caracteres)` }, 413);
  }

  // Rate limit (utilizador anónimo na Fase 1)
  const userKey = 'anonymous';
  const rate = await checkRateLimit(env, userKey);
  if (!rate.allowed) {
    return json(
      { error: 'Demasiados pedidos. Tente novamente em breve.', retry_after: rate.retryAfterSeconds },
      429,
    );
  }

  const requestId = generateRequestId();

  // Cria a resposta streaming
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = makeSender(controller, encoder);
      const startedAt = Date.now();
      let latencyMs = 0;
      let totalTimeMs = 0;
      let backendId = 'mock';
      let result: { content: string; inputTokens: number; outputTokens: number } | null = null;

      try {
        send({ type: 'accepted', request_id: requestId });

        // Cache
        const cached = await getCachedResponse(env, message);
        if (cached) {
          backendId = 'cache';
          controller.enqueue(encoder.encode(encodeSSE({
            type: 'status',
            message: 'Resposta encontrada em cache',
            request_id: requestId,
          })));
          const tokens = cached.content.match(/\S+\s*/g) ?? [];
          for (const t of tokens) {
            send({ type: 'token', text: t, request_id: requestId });
          }
          send({
            type: 'metrics',
            backend: 'cache',
            cache: 'hit',
            latency_ms: Date.now() - startedAt,
            total_time_ms: Date.now() - startedAt,
            tokens: tokens.length,
            request_id: requestId,
          });
          send({ type: 'completed', request_id: requestId });
          result = { content: cached.content, inputTokens: Math.ceil(message.length / 4), outputTokens: tokens.length };
          latencyMs = Date.now() - startedAt;
          totalTimeMs = latencyMs;
          await insertRequest(env, {
            id: requestId,
            conversationId: body.conversation_id,
            status: 'completed',
            backend: 'cache',
            cacheHit: true,
            latencyMs,
            totalTimeMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          });
          return;
        }

        // Seleciona a cadeia de backends, por ordem de preferência
        const backendChain = await selectBackend(env);
        latencyMs = Date.now() - startedAt;

        // Garante conversa. O conversation_id pode vir do cliente (gerado
        // localmente para uma conversa nova) — se ainda não existir na base
        // de dados, criamo-la com esse mesmo id em vez de gerar um novo,
        // para o cliente e o servidor ficarem sempre de acordo.
        let conversationId = body.conversation_id;
        const title = message.length > 40 ? `${message.slice(0, 40)}…` : message;
        if (!conversationId) {
          const conv = await createConversation(env, title);
          conversationId = conv.id;
        } else if (!(await conversationExists(env, conversationId))) {
          await createConversation(env, title, 'anonymous', conversationId);
        }

        // Guarda a mensagem do utilizador
        await insertMessage(env, conversationId, 'user', message);

        // Tenta cada backend da cadeia até um responder com sucesso.
        // O mock nunca deve falhar, por isso serve de rede de segurança final.
        let lastError: unknown = null;
        for (const backend of backendChain) {
          backendId = backend.id;
          try {
            result = await backend.generateStream(
              { conversation_id: conversationId, message, max_output_tokens: maxOutputTokens },
              env,
              send,
            );
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            const isLast = backend === backendChain[backendChain.length - 1];
            if (!isLast) {
              send({
                type: 'status',
                message: `Backend "${backend.id}" indisponível, a tentar o próximo…`,
                request_id: requestId,
              });
            }
          }
        }

        if (!result) {
          send({
            type: 'error',
            error: lastError instanceof Error ? lastError.message : 'Erro de inferência',
            request_id: requestId,
          });
          await insertRequest(env, {
            id: requestId,
            conversationId,
            status: 'error',
            backend: backendId,
            cacheHit: false,
            latencyMs,
            totalTimeMs: Date.now() - startedAt,
            errorMessage: lastError instanceof Error ? lastError.message : 'Erro desconhecido',
          });
          controller.close();
          return;
        }

        totalTimeMs = Date.now() - startedAt;

        // Guarda resposta e métricas
        await insertMessage(
          env,
          conversationId,
          'assistant',
          result.content,
          env.MODEL_NAME || 'gpt-oss-120b',
          backendId,
        );
        await setCachedResponse(env, message, env.MODEL_NAME || 'gpt-oss-120b', result.content);
        await insertRequest(env, {
          id: requestId,
          conversationId,
          status: 'completed',
          backend: backendId,
          cacheHit: false,
          latencyMs,
          totalTimeMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });

        send({
          type: 'metrics',
          backend: backendId,
          cache: 'miss',
          latency_ms: latencyMs,
          total_time_ms: totalTimeMs,
          tokens: result.outputTokens,
          request_id: requestId,
        });
        send({ type: 'completed', request_id: requestId });
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Erro interno',
          request_id: requestId,
        });
        await insertRequest(env, {
          id: requestId,
          conversationId: body.conversation_id,
          status: 'error',
          backend: backendId,
          cacheHit: false,
          latencyMs,
          totalTimeMs: Date.now() - startedAt,
          errorMessage: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}