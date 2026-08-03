import type {
  ApiConfig,
  ChatRequest,
  Conversation,
  Message,
  StatusResponse,
  StreamEvent,
} from '../types';

const DEFAULT_CONFIG: ApiConfig = {
  // Em produção, o Worker e a app partilham o mesmo domínio (ex: /api/v1).
  // Em dev, o Vite faz proxy de /v1 para localhost:8787.
  baseUrl: '',
};

let config: ApiConfig = DEFAULT_CONFIG;

export function configureApi(next: Partial<ApiConfig>) {
  config = { ...config, ...next };
}

function url(path: string): string {
  return `${config.baseUrl}${path}`;
}

async function handleResponse(res: Response): Promise<any> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }
  return res.json();
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(url('/v1/status'));
  return handleResponse(res);
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(url('/v1/conversations'));
  const data = await handleResponse(res);
  return data.conversations ?? [];
}

export async function getConversation(id: string): Promise<{
  conversation: Conversation;
  messages: Message[];
}> {
  const res = await fetch(url(`/v1/conversations/${id}`));
  return handleResponse(res);
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const res = await fetch(url(`/v1/conversations/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return handleResponse(res);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(url(`/v1/conversations/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
}

export async function cancelGeneration(requestId: string): Promise<void> {
  const res = await fetch(url(`/v1/generations/${requestId}/cancel`), { method: 'POST' });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
}

export async function generateImage(prompt: string): Promise<{ url: string; prompt: string }> {
  const res = await fetch(url('/v1/image'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  return handleResponse(res);
}

export interface CoderModel {
  id: string;
  label: string;
}

export async function listCoderModels(): Promise<{ models: CoderModel[]; default: string }> {
  const res = await fetch(url('/v1/coder/models'));
  return handleResponse(res);
}

/**
 * Assistentes extra isolados (via OpenRouter, grátis).
 * Não partilham estado com o streamChat do gpt-oss-120b.
 */
export async function streamCoder(
  message: string,
  model: string | undefined,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url('/v1/coder'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }
  if (!res.body) throw new Error('Sem corpo de resposta');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      const payload = dataLine.slice(6).trim();
      if (!payload) continue;

      try {
        onEvent(JSON.parse(payload) as StreamEvent);
      } catch {
        // ignora payloads inválidos
      }
    }
  }
}

/**
 * Envia uma mensagem e lê a resposta em streaming (SSE).
 * Invoca onEvent para cada evento recebido.
 */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url('/v1/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }

  if (!res.body) throw new Error('Sem corpo de resposta');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Processa eventos SSE separados por linha em branco
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const dataLine = rawEvent
        .split('\n')
        .find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      const payload = dataLine.slice(6).trim();
      if (!payload) continue;

      try {
        const event = JSON.parse(payload) as StreamEvent;
        onEvent(event);
      } catch {
        // ignora payloads inválidos
      }
    }
  }
}