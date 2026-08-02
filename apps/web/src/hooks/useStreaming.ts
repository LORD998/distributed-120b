import { useCallback, useRef, useState } from 'react';
import type { NetworkMetrics, StreamEvent } from '../types';
import { streamChat } from '../services/api';

interface UseStreamingOptions {
  onToken?: (text: string) => void;
  onMetrics?: (metrics: NetworkMetrics) => void;
  onCompleted?: (requestId: string) => void;
  onError?: (message: string) => void;
}

export function useStreaming(options: UseStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const send = useCallback(
    async (payload: { conversation_id?: string; message: string; max_output_tokens?: number }) => {
      // Cancela qualquer stream anterior
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let accumulated = '';
      let metrics: NetworkMetrics | null = null;

      const handleEvent = (event: StreamEvent) => {
        switch (event.type) {
          case 'accepted':
            if (event.request_id) setRequestId(event.request_id);
            break;
          case 'token':
            if (event.text) {
              accumulated += event.text;
              options.onToken?.(accumulated);
            }
            break;
          case 'metrics':
            if (event.backend && event.latency_ms !== undefined) {
              metrics = {
                model: 'gpt-oss-120b',
                backend: event.backend,
                state: 'online',
                cache: event.cache ?? 'miss',
                latencyMs: event.latency_ms,
                totalTimeMs: event.total_time_ms ?? 0,
                tokensGenerated: event.tokens ?? 0,
                nodesAvailable: 0,
              };
              options.onMetrics?.(metrics);
            }
            break;
          case 'completed':
            if (event.request_id) options.onCompleted?.(event.request_id);
            break;
          case 'error':
            options.onError?.(event.error ?? 'Erro desconhecido');
            break;
        }
      };

      try {
        await streamChat(payload, handleEvent, controller.signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // cancelado pelo utilizador
        } else {
          options.onError?.(err instanceof Error ? err.message : 'Erro ao comunicar com a rede');
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [options],
  );

  return { send, stop, isStreaming, requestId };
}