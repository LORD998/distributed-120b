import type { Env } from '../types';
import { getBackendInfo } from '../services/router';
import { listActiveNodes } from '../services/nodes';

export async function handleStatus(env: Env): Promise<Response> {
  const backend = await getBackendInfo(env);
  let nodes = 0;

  try {
    const active = await listActiveNodes(env);
    nodes = active.length;
  } catch {
    // D1 pode ainda não estar migrado — não bloqueia o status
  }

  const body = {
    status: 'online',
    model: env.MODEL_NAME || 'openai/gpt-oss-120b',
    backend: backend.id,
    distributed_nodes: nodes,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}