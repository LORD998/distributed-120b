import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message } from '../types';
import { listCoderModels, streamCoder, type CoderModel } from '../services/api';

/**
 * Assistentes extra isolados (via OpenRouter, grátis) — vários modelos
 * selecionáveis. Estado totalmente à parte do useChat/useConversations —
 * não mexe em nada do fluxo do gpt-oss-120b.
 */
export function useCoder() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<CoderModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listCoderModels()
      .then((data) => {
        setModels(data.models);
        setSelectedModel((current) => current ?? data.default);
      })
      .catch(() => {
        // sem lista disponível — o backend usa o modelo por omissão
      });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    setIsStreaming(true);

    const userMsg: Message = {
      id: `coder_user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const assistantMsg: Message = {
      id: `coder_assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';

    try {
      await streamCoder(
        trimmed,
        selectedModel,
        (event) => {
          if (event.type === 'token' && event.text) {
            accumulated += event.text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: accumulated } : m)),
            );
          } else if (event.type === 'error') {
            setError(event.error ?? 'Erro desconhecido');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, isStreaming: false, isError: true, content: event.error ?? 'Erro' }
                  : m,
              ),
            );
          } else if (event.type === 'completed') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsg.id ? { ...m, isStreaming: false } : m)),
            );
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const message = err instanceof Error ? err.message : 'Erro ao comunicar com o OpenRouter';
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false, isError: true, content: message } : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, selectedModel]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stop,
    models,
    selectedModel,
    setSelectedModel,
  };
}
