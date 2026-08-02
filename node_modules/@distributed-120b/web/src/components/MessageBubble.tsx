import { useMemo, useState } from 'react';
import { Check, Copy, User, Bot, AlertTriangle } from 'lucide-react';
import type { Message } from '../types';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
}

/** Renderização leve de Markdown (sem dependências externas). */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      nodes.push(
        <Tag key={`list-${key++}`}>
          {listItems.map((item, i) => (
            <li key={i}>{inlineMarkdown(item)}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    // Bloco de código
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <CodeBlock key={`code-${key++}`} language={codeLang} code={codeLines.join('\n')} />,
        );
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Cabeçalhos
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      nodes.push(<Tag key={`h-${key++}`}>{inlineMarkdown(heading[2])}</Tag>);
      continue;
    }

    // Listas
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const type = ulMatch ? 'ul' : 'ol';
      if (listType && listType !== type) flushList();
      listType = type;
      listItems.push((ulMatch ?? olMatch)![1]);
      continue;
    }

    // Citação
    if (line.trim().startsWith('>')) {
      flushList();
      nodes.push(
        <blockquote key={`q-${key++}`}>{inlineMarkdown(line.trim().slice(1).trim())}</blockquote>,
      );
      continue;
    }

    // Linha em branco
    if (line.trim() === '') {
      flushList();
      continue;
    }

    flushList();
    nodes.push(<p key={`p-${key++}`}>{inlineMarkdown(line)}</p>);
  }

  flushList();
  if (inCodeBlock) {
    nodes.push(
      <CodeBlock key={`code-${key++}`} language={codeLang} code={codeLines.join('\n')} />,
    );
  }

  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        if (linkMatch[1].toLowerCase().includes('video') || linkMatch[2].endsWith('.mp4')) {
          nodes.push(
            <video key={key++} src={linkMatch[2]} controls style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />
          );
        } else {
          nodes.push(
            <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer">
              {linkMatch[1]}
            </a>,
          );
        }
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível
    }
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{language || 'code'}</span>
        <button className={styles.copyButton} onClick={copy} aria-label="Copiar código">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <pre className={styles.codePre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const content = useMemo(() => {
    if (isUser) return message.content;
    return renderMarkdown(message.content);
  }, [message.content, isUser]);

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.userWrapper : styles.assistantWrapper}`}>
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.assistantAvatar}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble} ${
          message.isError ? styles.errorBubble : ''
        }`}
      >
        {message.isError && (
          <div className={styles.errorHeader}>
            <AlertTriangle size={14} />
            <span>Erro</span>
          </div>
        )}
        <div className={styles.content}>
          {isUser ? message.content : content}
          {message.isStreaming && <span className="typing-cursor" />}
        </div>
      </div>
    </div>
  );
}