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
            <MessageSquare size={32} />
          </div>
          <h2 className={styles.emptyTitle}>IA Distribuída 120B</h2>
          <p className={styles.emptyText}>
            Faça uma pergunta ao modelo <code>gpt-oss-120b</code>.
            <br />
            As respostas chegam em tempo real, transmitidas progressivamente.
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