export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  INFERENCE_MODE: string;
  MODEL_NAME: string;
  HF_TOKEN?: string;
  CACHE_TTL_SECONDS?: string;
  MAX_MESSAGE_LENGTH?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
}

export type InferenceMode = 'mock' | 'huggingface';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  backend?: string;
  created_at: string;
}

export interface RequestRow {
  id: string;
  conversation_id?: string;
  status: string;
  backend?: string;
  cache_hit: number;
  latency_ms?: number;
  total_time_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ChatRequestBody {
  conversation_id?: string;
  message: string;
  max_output_tokens?: number;
  use_deep_think?: boolean;
}

export interface BackendChoice {
  id: string;
  mode: InferenceMode;
  endpoint?: string;
}

export interface DistributedNode {
  id: string;
  name?: string;
  endpoint: string;
  region?: string;
  gpu_model?: string;
  vram_gb?: number;
  status: string;
  last_heartbeat: string;
}

export interface GenerationResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface Backend {
  id: string;
  generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult>;
}

export interface StreamEventType {
  type: 'accepted' | 'status' | 'token' | 'metrics' | 'completed' | 'error';
}

export interface StreamEvent extends StreamEventType {
  request_id?: string;
  message?: string;
  text?: string;
  backend?: string;
  cache?: 'hit' | 'miss';
  latency_ms?: number;
  total_time_ms?: number;
  tokens?: number;
  error?: string;
}