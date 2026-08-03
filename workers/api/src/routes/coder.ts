import type { Env } from '../types';
import { encodeSSE, makeSender } from '../backends/backend';

/**
 * Rota isolada para os assistentes extra (via OpenRouter, grátis).
 * Completamente separada do /v1/chat (gpt-oss-120b) — não toca em cache,
 * D1, rate limit ou no fallback chain existentes.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface CoderModel {
  id: string;
  label: string;
}

export const CODER_MODELS: CoderModel[] = [
  { id: 'poolside/laguna-s-2.1:free', label: 'Laguna S 2.1' },
  { id: 'poolside/laguna-xs-2.1:free', label: 'Laguna XS 2.1' },
  { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code' },
];

const DEFAULT_MODEL = CODER_MODELS[0].id;
const MODEL_IDS = new Set(CODER_MODELS.map((m) => m.id));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleCoder(request: Request, env: Env): Promise<Response> {
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
  if (!message) {
    return json({ error: 'Mensagem vazia' }, 400);
  }

  // Só aceita modelos da lista permitida — nunca reencaminha um id arbitrário.
  const requestedModel = typeof body.model === 'string' ? body.model : DEFAULT_MODEL;
  const model = MODEL_IDS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
  const modelLabel = CODER_MODELS.find((m) => m.id === model)?.label ?? model;

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json(
      { error: 'OPENROUTER_API_KEY não configurado. Define-o em workers/api/.dev.vars.' },
      500,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = makeSender(controller, encoder);

      try {
        send({ type: 'accepted' });
        send({ type: 'status', message: `A contactar o ${modelLabel}…` });

        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: message }],
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          throw new Error(`Erro do fornecedor (${res.status}): ${text.slice(0, 200)}`);
        }

        send({ type: 'status', message: 'A receber resposta…' });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) send({ type: 'token', text: delta });
            } catch {
              // ignora blocos inválidos
            }
          }
        }

        send({ type: 'completed', backend: model });
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Erro ao comunicar com o OpenRouter',
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
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** GET /v1/coder/models — lista os modelos disponíveis para o seletor. */
export function handleCoderModels(): Response {
  return json({ models: CODER_MODELS, default: DEFAULT_MODEL });
}
