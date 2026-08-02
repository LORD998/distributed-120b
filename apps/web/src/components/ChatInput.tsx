import { useRef, useState } from 'react';
import { Send, Square, Paperclip, Brain } from 'lucide-react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string, useDeepThink: boolean) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  maxLength = 4000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [useDeepThink, setUseDeepThink] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed, useDeepThink);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    if (next.length > maxLength) return;
    setValue(next);

    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className={styles.container}>
      <div className={`${styles.inputWrapper} glass-panel`}>
        <button
          className={styles.attachButton}
          type="button"
          aria-label="Anexar ficheiro (em breve)"
          title="Upload de ficheiros em breve"
          disabled
        >
          <Paperclip size={18} />
        </button>

        <button
          className={`${styles.attachButton} ${useDeepThink ? styles.deepThinkActive : ''}`}
          type="button"
          aria-label="Raciocínio Profundo"
          title="Raciocínio Profundo (Beta)"
          onClick={() => setUseDeepThink(!useDeepThink)}
          style={{ color: useDeepThink ? '#c084fc' : 'inherit' }}
        >
          <Brain size={18} />
        </button>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite a mensagem... (ou /imagem <descrição> para gerar uma imagem)"
          rows={1}
          maxLength={maxLength}
          disabled={disabled}
        />

        {isStreaming ? (
          <button
            className={`${styles.sendButton} ${styles.stopButton}`}
            type="button"
            onClick={onStop}
            aria-label="Parar geração"
            title="Parar"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            className={styles.sendButton}
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>Enter envia · Shift+Enter nova linha</span>
        <span className={styles.counter}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}