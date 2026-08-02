import { useCallback, useEffect, useState } from 'react';
import type { Conversation } from '../types';
import {
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
} from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listConversations();
      setConversations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const select = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const createLocal = useCallback((title: string): Conversation => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: `conv_${Date.now()}`,
      title,
      createdAt: now,
      updatedAt: now,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv;
  }, []);

  const rename = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await renameConversation(id, title);
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: updated.title, updatedAt: updated.updatedAt } : c)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao renomear');
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) setActiveId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao eliminar');
      }
    },
    [activeId],
  );

  const loadMessages = useCallback(async (id: string) => {
    try {
      const data = await getConversation(id);
      return data.messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
      return [];
    }
  }, []);

  return {
    conversations,
    activeId,
    loading,
    error,
    refresh,
    select,
    createLocal,
    rename,
    remove,
    loadMessages,
  };
}