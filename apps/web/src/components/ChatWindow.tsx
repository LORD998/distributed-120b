import { Loader2, MessageSquare } from 'lucide-react';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  messages: Message[];
  thinking: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({ messages, thinking, messagesEndRef }: ChatWindowProps) {
  return (
    <div className={styles.container}>
      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <div className={styles.glowEffect}></div>
            <MessageSquare size={36} className={styles.emptyIconSvg} />
          </div>
          <h2 className={styles.emptyTitle}>Bem-vindo à Aura AI</h2>
          <p className={styles.emptyText}>
            A inteligência artificial do futuro, rodando em nossa arquitetura imortal 24/7.
            <br />
            Peça para <strong>gerar vídeos</strong>, <strong>criar imagens fotorealistas</strong>, ou <strong>transcrever áudios</strong>.
          </p>
        </div>
      ) : (
        <div className={styles.messages}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {thinking && (
            <div className={styles.thinking}>
              <Loader2 className="animate-spin" size={16} />
              <span>A pensar…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}