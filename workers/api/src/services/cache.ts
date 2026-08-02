import type { Env } from '../types';
import { hashMessage } from '../backends/backend';

interface CacheEntry {
  model: string;
  content: string;
  created_at: string;
  expires_at: string;
}

/**
 * Procura e devolve a resposta em cache para uma pergunta.
 * Chave: cache:response:<hash>
 */
export async function getCachedResponse(
  env: Env,
  message: string,
): Promise<{ content: string; hit: boolean } | null> {
  const key = `cache:response:${await hashMessage(message)}`;
  const raw = await env.KV.get(key);

  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (new Date(entry.expires_at).getTime() < Date.now()) {
      await env.KV.delete(key);
      return null;
    }
    return { content: entry.content, hit: true };
  } catch {
    await env.KV.delete(key);
    return null;
  }
}

/**
 * Guarda uma resposta em cache.
 */
export async function setCachedResponse(
  env: Env,
  message: string,
  model: string,
  content: string,
): Promise<void> {
  const key = `cache:response:${await hashMessage(message)}`;
  const now = Date.now();
  const ttlSeconds = Number(env.CACHE_TTL_SECONDS ?? 86400);

  const entry: CacheEntry = {
    model,
    content,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlSeconds * 1000).toISOString(),
  };

  await env.KV.put(key, JSON.stringify(entry), {
    expirationTtl: ttlSeconds,
  });
}

/**
 * Rate limit simples: janela deslizante por user_id.
 * Chave: rate_limit:<user_id>
 */
export async function checkRateLimit(env: Env, userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}> {
  const key = `rate_limit:${userId}`;
  const max = Number(env.RATE_LIMIT_MAX ?? 20);
  const windowSeconds = Number(env.RATE_LIMIT_WINDOW_SECONDS ?? 60);

  const raw = await env.KV.get(key);
  const now = Date.now();

  let timestamps: number[] = [];
  if (raw) {
    try {
      timestamps = JSON.parse(raw) as number[];
    } catch {
      timestamps = [];
    }
  }

  // Remove timestamps fora da janela
  timestamps = timestamps.filter((t) => now - t < windowSeconds * 1000);

  if (timestamps.length >= max) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000));
    await env.KV.put(key, JSON.stringify(timestamps), {
      expirationTtl: windowSeconds,
    });
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  timestamps.push(now);
  await env.KV.put(key, JSON.stringify(timestamps), {
    expirationTtl: windowSeconds,
  });

  return {
    allowed: true,
    remaining: max - timestamps.length,
    retryAfterSeconds: 0,
  };
}