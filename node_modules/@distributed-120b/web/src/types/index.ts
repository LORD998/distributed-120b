export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  max_output_tokens?: number;
}

export interface StatusResponse {
  status: 'online' | 'degraded' | 'offline';
  model: string;
  backend: string;
  distributed_nodes: number;
}

export interface NetworkMetrics {
  model: string;
  backend: string;
  state: 'online' | 'degraded' | 'offline';
  cache: 'hit' | 'miss';
  latencyMs: number;
  totalTimeMs: number;
  tokensGenerated: number;
  nodesAvailable: number;
}

export interface StreamEvent {
  type: 'accepted' | 'status' | 'token' | 'metrics' | 'completed' | 'error';
  request_id?: string;
  message?: string;
  text?: string;
  backend?: string;
  latency_ms?: number;
  total_time_ms?: number;
  tokens?: number;
  cache?: 'hit' | 'miss';
  error?: string;
}

export interface ApiConfig {
  baseUrl: string;
}