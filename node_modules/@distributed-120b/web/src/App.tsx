import { useEffect, useState } from 'react';
import { Zap, Loader2, MessageSquare, Code2 } from 'lucide-react';
import type { StatusResponse } from './types';
import { getStatus } from './services/api';
import { useChat } from './hooks/useChat';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ConversationSidebar } from './components/ConversationSidebar';
import { NetworkPanel } from './components/NetworkPanel';
import { CoderPanel } from './components/CoderPanel';
import styles from './App.module.css';

type View = 'chat' | 'coder';

export default function App() {
  const {
    messages,
    metrics,
    thinking,
    error,
    isStreaming,
    messagesEndRef,
    sendMessage,
    stop,
    loadConversation,
    newConversation,
    conversations,
  } = useChat();

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [view, setView] = useState<View>('chat');

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));
  }, []);

  return (
    <div className={styles.app}>
      <ConversationSidebar
        conversations={conversations.conversations}
        activeId={conversations.activeId}
        onNew={newConversation}
        onSelect={loadConversation}
        onRename={conversations.rename}
        onDelete={conversations.remove}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <Zap size={20} fill="currentColor" />
              <span>120B Network</span>
            </div>
            <span className={styles.headerBadge}>Fase 1</span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${view === 'chat' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setView('chat')}
              >
                <MessageSquare size={14} />
                <span>Chat</span>
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${view === 'coder' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setView('coder')}
              >
                <Code2 size={14} />
                <span>Código</span>
              </button>
            </div>
            {view === 'chat' && conversations.activeId && (
              <span className={styles.muted}>Conversa ativa</span>
            )}
            <span
              className={`${styles.statusPill} ${
                statusLoading ? styles.statusPillLoading : styles[`statusPill-${status?.status ?? 'offline'}`]
              }`}
            >
              {statusLoading ? (
                <>
                  <Loader2 className="animate-spin" size={12} />
                  <span>A verificar…</span>
                </>
              ) : (
                <>
                  <span className={styles.statusDot} />
                  <span>{status?.status ?? 'offline'}</span>
                </>
              )}
            </span>
          </div>
        </header>

        {view === 'chat' ? (
          <>
            <ChatWindow
              messages={messages}
              thinking={thinking}
              messagesEndRef={messagesEndRef}
            />

            {error && (
              <div className={styles.errorBar}>
                <span>{error}</span>
              </div>
            )}

            <ChatInput
              onSend={sendMessage}
              onStop={stop}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <CoderPanel />
        )}
      </main>

      <NetworkPanel status={status} metrics={metrics} loading={statusLoading} />
    </div>
  );
}