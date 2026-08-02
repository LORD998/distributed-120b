import type { Env } from '../types';
import { listActiveNodes, upsertHeartbeat } from '../services/nodes';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleNodes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/v1/heartbeat' && request.method === 'POST') {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return json({ error: 'Token de autorização (Bearer) obrigatório' }, 401);
      }
      const token = authHeader.split(" ")[1];

      // Verifica token na DB D1
      const isValid = await env.DB.prepare("SELECT * FROM authorized_tokens WHERE token = ?").bind(token).first();
      if (!isValid) {
        return json({ error: 'Token inválido ou não autorizado' }, 403);
      }

      const body = (await request.json()) as {
        node_id?: string;
        region?: string;
        vram_gb?: number;
        gpu_model?: string;
        status?: string;
      };
      if (!body.node_id) {
        return json({ error: 'node_id é obrigatório' }, 400);
      }
      await upsertHeartbeat(env, {
        node_id: body.node_id,
        region: body.region,
        vram_gb: body.vram_gb,
        gpu_model: body.gpu_model,
        status: body.status,
      });
      return json({ status: 'ok' });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }

  // GET /v1/nodes — listar nós ativos
  if (url.pathname === '/v1/nodes' && request.method === 'GET') {
    try {
      const nodes = await listActiveNodes(env);
      return json({ nodes });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }

  return json({ error: 'Não encontrado' }, 404);
}

export async function handleCancel(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/v1\/generations\/([^/]+)\/cancel$/);

  if (!match || request.method !== 'POST') {
    return json({ error: 'Não encontrado' }, 404);
  }

  const requestId = decodeURIComponent(match[1]);

  // Define o sinal de cancelamento no KV.
  // O backend (mock) verifica esta chave durante a geração e interrompe.
  // O cancelamento total do fornecedor depende do suporte do mesmo;
  // o frontend interrompe de qualquer forma a apresentação.
  await env.KV.put(`generation:cancelled:${requestId}`, '1', {
    expirationTtl: 300,
  });

  return json({ status: 'cancelling', request_id: requestId });
}