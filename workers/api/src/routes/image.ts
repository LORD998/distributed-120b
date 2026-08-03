import type { Env } from '../types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Gera uma imagem a partir de um prompt de texto, via Pollinations.ai
 * (serviço público, gratuito, sem chave de API). O Worker não descarrega
 * nem reencaminha a imagem — devolve apenas o URL, que o browser carrega
 * diretamente a partir da Pollinations.
 */
export async function handleImage(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return json({ error: 'Prompt vazio' }, 400);
  }
  const maxLen = Number(env.MAX_MESSAGE_LENGTH ?? 4000);
  if (prompt.length > maxLen) {
    return json({ error: `Prompt demasiado longo (máx ${maxLen} caracteres)` }, 413);
  }

  const seed = Math.floor(Math.random() * 1_000_000);
  const encodedPrompt = encodeURIComponent(`${prompt}, ultra realistic, 8k`);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

  return json({ url, prompt });
}
