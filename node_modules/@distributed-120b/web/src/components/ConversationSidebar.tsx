import { useState } from 'react';
import { Plus, Search, MessageSquare, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '../types';
import styles from './ConversationSidebar.module.css';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
    setMenuOpenId(null);
  };

  const confirmEdit = () => {
    if (editingId && editingTitle.trim()) {
      onRename(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.logoText}>120B Network</span>
        <button className={styles.newButton} onClick={onNew} aria-label="Nova conversa">
          <Plus size={16} />
          <span>Nova conversa</span>
        </button>
      </div>

      <div className={styles.search}>
        <Search size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar conversas..."
          aria-label="Pesquisar conversas"
        />
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>
            {query ? 'Sem resultados' : 'Sem conversas ainda'}
          </p>
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.item} ${conv.id === activeId ? styles.itemActive : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare size={16} className={styles.itemIcon} />
              <div className={styles.itemBody}>
                {editingId === conv.id ? (
                  <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className={styles.editInput}
                    />
                    <button className={styles.editAction} onClick={confirmEdit} aria-label="Confirmar">
                      <Check size={14} />
                    </button>
                    <button
                      className={styles.editAction}
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={styles.itemTitle}>{conv.title}</span>
                    <span className={styles.itemDate}>{formatDate(conv.updatedAt)}</span>
                  </>
                )}
              </div>

              {editingId !== conv.id && (
                <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    className={styles.moreButton}
                    onClick={() => setMenuOpenId(menuOpenId === conv.id ? null : conv.id)}
                    aria-label="Mais opções"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenId === conv.id && (
                    <div className={styles.menu}>
                      <button onClick={() => startEdit(conv)}>
                        <Pencil size={14} />
                        <span>Renomear</span>
                      </button>
                      <button className={styles.menuDanger} onClick={() => onDelete(conv.id)}>
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}