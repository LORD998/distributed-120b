import type { Backend, BackendChoice, Env } from '../types';
import { MockBackend } from '../backends/mock';
import { HuggingFaceBackend } from '../backends/huggingface';
import { DistributedBackend } from '../backends/distributed';
import { findHealthyDistributedNode } from './database';

/**
 * Seleciona a cadeia de backends de inferência, por ordem de preferência.
 *
 * Fase 1: cache → Hugging Face (se HF_TOKEN) → mock
 * Fase 2: cache → nós próprios/voluntários → rede distribuída → Hugging Face → mock
 *
 * A cadeia é usada com fallback: se um backend falhar (ex.: nó distribuído
 * anunciado como saudável mas ainda sem inferência real ligada), o pedido
 * cai para o próximo em vez de falhar por completo. O mock é sempre o
 * último elemento — nunca deve lançar erro.
 */
export async function selectBackend(env: Env): Promise<Backend[]> {
  const mode = env.INFERENCE_MODE ?? 'mock';
  const chain: Backend[] = [];

  // Tenta primeiro um nó distribuído saudável (Fase 2)
  const distributedNode = await findHealthyDistributedNode(env);
  if (distributedNode) {
    chain.push(DistributedBackend);
  }

  if (mode === 'huggingface' && env.HF_TOKEN) {
    chain.push(HuggingFaceBackend);
  }

  chain.push(MockBackend);

  return chain;
}

export async function getBackendInfo(env: Env): Promise<BackendChoice> {
  const mode = env.INFERENCE_MODE ?? 'mock';

  if (mode === 'huggingface' && env.HF_TOKEN) {
    return { id: 'huggingface', mode: 'huggingface' };
  }

  if (mode === 'mock') {
    return { id: 'mock', mode: 'mock' };
  }

  return { id: 'mock', mode: 'mock' };
}