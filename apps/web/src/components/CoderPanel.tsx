import { useEffect, useRef } from 'react';
import { Code2 } from 'lucide-react';
import { useCoder } from '../hooks/useCoder';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import styles from './CoderPanel.module.css';

/**
 * Assistentes extra isolados (via OpenRouter, grátis) — vários modelos
 * selecionáveis. Secção própria, independente do chat principal do
 * gpt-oss-120b — reutiliza ChatWindow/ChatInput sem alterar o
 * comportamento deles.
 */
export function CoderPanel() {
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    stop,
    models,
    selectedModel,
    setSelectedModel,
  } = useCoder();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.panel}>
      <div className={styles.banner}>
        <Code2 size={14} />
        <span>Assistentes extra (OpenRouter, grátis)</span>

        {models.length > 0 && (
          <select
            className={styles.modelSelect}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isStreaming}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <ChatWindow messages={messages} thinking={false} messagesEndRef={messagesEndRef} />

      {error && (
        <div className={styles.errorBar}>
          <span>{error}</span>
        </div>
      )}

      <ChatInput
        onSend={(text) => sendMessage(text)}
        onStop={stop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
