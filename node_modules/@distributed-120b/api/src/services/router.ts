import type { Backend, BackendChoice, Env } from '../types';
import { MockBackend } from '../backends/mock';
import { HuggingFaceBackend } from '../backends/huggingface';
import { DistributedBackend } from '../backends/distributed';
import { findHealthyDistributedNode } from './database';
import { OpenRouterBackend } from '../backends/openrouter';
import { GroqBackend } from '../backends/groq';

/**
 * Seleciona a cadeia de backends de inferência, por ordem de preferência.
 *
 * Fase 1: cache → Groq (ultra rápido/grátis) → OpenRouter (se tiver crédito) → Hugging Face → mock
 */
export async function selectBackend(env: Env): Promise<Backend[]> {
  const mode = env.INFERENCE_MODE ?? 'mock';
  const chain: Backend[] = [];

  // 1º lugar absoluto agora: GROQ (ultra veloz, Llama 3)
  if (env.GROQ_API_KEY) {
     chain.push(GroqBackend);
  }

  // 2º fallback
  if (env.OPENROUTER_API_KEY) {
     chain.push(OpenRouterBackend);
  }

  // 3º fallback
  if (mode === 'huggingface' && env.HF_TOKEN) {
    chain.push(HuggingFaceBackend);
  }

  // Última esperança
  chain.push(MockBackend);

  return chain;
}

export async function getBackendInfo(env: Env): Promise<BackendChoice> {
  const mode = env.INFERENCE_MODE ?? 'mock';

  if (env.GROQ_API_KEY) {
    return { id: 'groq', mode: 'groq' };
  }

  if (mode === 'huggingface' && env.HF_TOKEN) {
    return { id: 'huggingface', mode: 'huggingface' };
  }

  if (mode === 'mock') {
    return { id: 'mock', mode: 'mock' };
  }

  return { id: 'mock', mode: 'mock' };
}