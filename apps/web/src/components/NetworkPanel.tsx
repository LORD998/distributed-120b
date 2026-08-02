import { useState } from 'react';
import { Cpu, Server, Database, Activity, Network, Globe, Zap, Key } from 'lucide-react';
import type { NetworkMetrics, StatusResponse } from '../types';
import styles from './NetworkPanel.module.css';

interface NetworkPanelProps {
  status: StatusResponse | null;
  metrics: NetworkMetrics | null;
  loading?: boolean;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function NetworkPanel({ status, metrics, loading = false }: NetworkPanelProps) {
  const state = status?.status ?? (metrics ? metrics.state : 'offline');
  const backend = metrics?.backend ?? status?.backend ?? 'A aguardar';
  const nodes = status?.distributed_nodes ?? metrics?.nodesAvailable ?? 0;

  const [volunteerName, setVolunteerName] = useState('');
  const [tokenResult, setTokenResult] = useState<{ token: string; instruction: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    if (!volunteerName.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch('http://localhost:8787/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteer_name: volunteerName }),
      });
      const data = await res.json();
      if (data.token) {
        setTokenResult({ token: data.token, instruction: data.instruction });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Estado da rede</span>
        <span className={`${styles.statusDot} ${styles[state]}`} />
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Cpu size={14} />
            <span>Modelo</span>
          </div>
          <p className={styles.modelName}>gpt-oss-120b</p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Network size={14} />
            <span>Backend</span>
          </div>
          <p className={styles.value}>{loading ? 'A verificar…' : backend}</p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Activity size={14} />
            <span>Estado</span>
          </div>
          <div className={styles.stateRow}>
            <span className={`${styles.statusDotSmall} ${styles[state]}`} />
            <p className={styles.value}>{loading ? 'A verificar…' : state}</p>
          </div>
        </div>

        <div className={styles.divider} />

        {metrics ? (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Zap size={14} />
                <span>Cache</span>
              </div>
              <p className={styles.value}>
                <span className={metrics.cache === 'hit' ? styles.cacheHit : styles.cacheMiss}>
                  {metrics.cache === 'hit' ? 'Hit' : 'Miss'}
                </span>
              </p>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Zap size={14} />
                <span>Latência inicial</span>
              </div>
              <p className={styles.value}>{formatMs(metrics.latencyMs)}</p>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Zap size={14} />
                <span>Tempo total</span>
              </div>
              <p className={styles.value}>{formatMs(metrics.totalTimeMs)}</p>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Zap size={14} />
                <span>Tokens gerados</span>
              </div>
              <p className={styles.value}>{metrics.tokensGenerated}</p>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>
            <Zap size={16} />
            <span>As métricas aparecerão após a primeira resposta</span>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Globe size={14} />
            <span>Nós distribuídos</span>
          </div>
          <p className={styles.value}>{nodes}</p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Server size={14} />
            <span>Infraestrutura</span>
          </div>
          <p className={styles.value}>Cloudflare Edge</p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Database size={14} />
            <span>Persistência</span>
          </div>
          <p className={styles.value}>D1 + KV</p>
        </div>
      <div className={styles.divider} />

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Key size={14} />
            <span>Seja um Voluntário (Fase 4/5)</span>
          </div>
          {!tokenResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Seu nome ou nick"
                value={volunteerName}
                onChange={(e) => setVolunteerName(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '8px',
                  color: 'white',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={handleRegister}
                disabled={registering}
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  color: 'white',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {registering ? 'Gerando...' : 'Gerar Token'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#a1a1aa' }}>
              <p style={{ color: '#4ade80', marginBottom: '8px' }}>✓ Token Gerado!</p>
              <p>Execute no seu terminal (pasta node-agent):</p>
              <code style={{
                display: 'block',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '4px',
                wordBreak: 'break-all',
                color: '#fff'
              }}>
                {tokenResult.instruction}
              </code>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}