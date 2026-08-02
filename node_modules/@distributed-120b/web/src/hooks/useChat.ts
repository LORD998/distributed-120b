import { useCallback, useEffect, useRef, useState } from 'react';
import type { Message, NetworkMetrics } from '../types';
import { useStreaming } from './useStreaming';
import { useConversations } from './useConversations';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = useConversations();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking, scrollToBottom]);

  const { send, stop, isStreaming, requestId } = useStreaming({
    onToken: (text) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.isStreaming) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
        }
        return prev;
      });
    },
    onMetrics: (m) => setMetrics(m),
    onCompleted: () => {
      setThinking(false);
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, isStreaming: false } : m)),
      );
    },
    onError: (msg) => {
      setThinking(false);
      setError(msg);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, isStreaming: false, isError: true, content: msg } : m,
        ),
      );
    },
  });

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setThinking(true);

      // 0–50ms: mensagem do utilizador aparece localmente
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // 100–200ms: indicador "A pensar…"
      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Garante uma conversa ativa
      let conversationId = conversations.activeId;
      if (!conversationId) {
        const title = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
        const conv = conversations.createLocal(title);
        conversationId = conv.id;
      }

      await send({
        conversation_id: conversationId,
        message: trimmed,
        max_output_tokens: 512,
      });
    },
    [isStreaming, conversations, send],
  );

  const loadConversation = useCallback(
    async (id: string) => {
      conversations.select(id);
      const msgs = await conversations.loadMessages(id);
      setMessages(msgs);
      setMetrics(null);
      setError(null);
    },
    [conversations],
  );

  const newConversation = useCallback(() => {
    conversations.select(null);
    setMessages([]);
    setMetrics(null);
    setError(null);
  }, [conversations]);

  return {
    messages,
    metrics,
    thinking,
    error,
    isStreaming,
    requestId,
    messagesEndRef,
    sendMessage,
    stop,
    loadConversation,
    newConversation,
    conversations,
  };
}