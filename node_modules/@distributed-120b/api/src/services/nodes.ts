import type { DistributedNode, Env } from '../types';

const NODE_TIMEOUT_SECONDS = 35;

/**
 * Regista ou atualiza um heartbeat de um nó distribuído (Fase 2).
 * Endpoint: POST /v1/heartbeat
 */
export async function upsertHeartbeat(
  env: Env,
  body: {
    node_id: string;
    endpoint?: string;
    region?: string;
    vram_gb?: number;
    gpu_model?: string;
    status?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const status = body.status ?? 'healthy';

  await env.DB.prepare(
    `INSERT INTO inference_nodes (id, name, endpoint, region, gpu_model, vram_gb, status, last_heartbeat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       endpoint=excluded.endpoint,
       region=excluded.region,
       gpu_model=excluded.gpu_model,
       vram_gb=excluded.vram_gb,
       status=excluded.status,
       last_heartbeat=excluded.last_heartbeat`,
  )
    .bind(
      body.node_id,
      body.node_id,
      body.endpoint ?? `${body.node_id}.local`,
      body.region ?? 'unknown',
      body.gpu_model ?? 'unknown',
      body.vram_gb ?? 0,
      status,
      now,
    )
    .run();
}

/**
 * Lista os nós ativos, removendo os que não enviam heartbeat há demasiado tempo.
 * Endpoint: GET /v1/nodes
 */
export async function listActiveNodes(env: Env): Promise<DistributedNode[]> {
  const cutoff = new Date(Date.now() - NODE_TIMEOUT_SECONDS * 1000).toISOString();

  // Marca inativos
  await env.DB.prepare(
    `UPDATE inference_nodes SET status = 'inactive' WHERE last_heartbeat < ?`,
  )
    .bind(cutoff)
    .run();

  const { results } = await env.DB.prepare(
    `SELECT id, name, endpoint, region, gpu_model, vram_gb, status, last_heartbeat
     FROM inference_nodes
     WHERE last_heartbeat > ?
     ORDER BY last_heartbeat DESC`,
  )
    .bind(cutoff)
    .all();

  return results as unknown as DistributedNode[];
}