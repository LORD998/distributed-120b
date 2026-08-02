import type { Env, StreamEvent } from '../types';

/**
 * Codifica um evento SSE e devolve o texto pronto a enviar.
 */
export function encodeSSE(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Envia um evento para um controlador de stream.
 */
export function makeSender(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): (event: StreamEvent) => void {
  return (event) => {
    try {
      controller.enqueue(encoder.encode(encodeSSE(event)));
    } catch {
      // Stream fechado — ignora
    }
  };
}

/**
 * Divide texto em pequenos blocos para simular tokens.
 */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

/**
 * Gera uma chave de cache determinística a partir da pergunta normalizada.
 */
export async function hashMessage(message: string): Promise<string> {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ');
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}