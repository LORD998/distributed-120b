# IA Distribuída 120B — Fase 1

Aplicação web própria para conversar com o modelo de IA `openai/gpt-oss-120b` (~120B parâmetros), hospedada inteiramente na Cloudflare — sem processamento no computador do utilizador.

## Arquitetura

```text
UTILIZADOR
    ↓
Aplicação React + Vite (Cloudflare Pages)
    ↓
POST /v1/chat
    ↓
Cloudflare Worker (API Gateway)
    ├── valida o pedido
    ├── verifica rate limit (KV)
    ├── procura no cache (KV)
    ├── regista o pedido no D1
    ├── escolhe o backend
    └── chama o modelo 120B
                 ↓
       Hugging Face Provider
                 ↓
         openai/gpt-oss-120b
                 ↓
        Resposta em streaming (SSE)
```

## Estrutura

```text
distributed-120b/
├── apps/web/          → Interface React 19 + Vite + TypeScript + CSS modules
├── workers/api/       → Cloudflare Worker (rotas, backends, cache, D1, métricas)
├── services/node-agent/ → Reservado para a Fase 2 (GPU voluntárias)
└── package.json       → Workspaces npm
```

## Como executar

Pré-requisito: Node.js 18+ e npm.

### 1. Instalar dependências (raiz, workspaces)

```bash
npm install
```

### 2. Backend (mock, sem chave)

```bash
npm run dev:api
```

O Worker local arranca em `http://localhost:8787`.

### 3. Frontend

```bash
npm run dev:web
```

A app arranca em `http://localhost:5173` e faz proxy de `/v1/*` para o Worker local.

## Modos de inferência

### Mock (padrão)

```env
INFERENCE_MODE=mock
```

Funciona sem qualquer chave. Simula streaming para testar interface, histórico, métricas e cache.

### Hugging Face (modelo 120B real)

1. Crie um token em [Hugging Face](https://huggingface.co/settings/tokens).
2. Configure o secret no Worker:

```bash
cd workers/api
npx wrangler secret put HF_TOKEN
```

3. Defina o modo:

```jsonc
// wrangler.jsonc
"vars": { "INFERENCE_MODE": "huggingface" }
```

Ordem de seleção do backend: cache → nó distribuído (se houver) → Hugging Face → mock.

## Base de dados (D1) e cache (KV)

### Criar recursos localmente

```bash
cd workers/api
npx wrangler d1 create distributed_120b      # copie o database_id
npx wrangler kv namespace create KV          # copie o id
```

Atualize `wrangler.jsonc` com os IDs.

### Aplicar migrações

```bash
npm run db:migrate:local     # local
npm run db:migrate:remote    # produção
```

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/v1/chat` | Envia mensagem; responde em SSE |
| GET | `/v1/status` | Estado, modelo, backend, nós |
| GET | `/v1/conversations` | Lista conversas |
| GET | `/v1/conversations/:id` | Carrega conversa com mensagens |
| PUT | `/v1/conversations/:id` | Renomeia |
| DELETE | `/v1/conversations/:id` | Elimina |
| POST | `/v1/generations/:request_id/cancel` | Cancela geração |
| POST | `/v1/heartbeat` | Heartbeat de nós (Fase 2) |
| GET | `/v1/nodes` | Lista nós ativos (Fase 2) |

## Formato de streaming

```text
event: accepted
data: {"type":"accepted","request_id":"req_..."}

event: token
data: {"type":"token","text":"A","request_id":"req_..."}

event: metrics
data: {"type":"metrics","backend":"mock","cache":"miss","latency_ms":10,...}

event: completed
data: {"type":"completed","request_id":"req_..."}
```

## Deploy

### API

```bash
cd workers/api
npx wrangler deploy
```

### Web (Cloudflare Pages)

- Build: `npm run build`
- Output: `dist`
- Branch de produção: `main`

Para evitar CORS, configure a app e a API no mesmo domínio (ex: `https://nome-do-projeto.com/api/v1/chat`).

## Decisões aprovadas

- ✅ Sem Discord
- ✅ React + Vite + TypeScript
- ✅ Interface premium em dark mode
- ✅ Cloudflare Pages + Worker
- ✅ Streaming SSE com `ReadableStream`
- ✅ D1 (conversas, mensagens, pedidos) + KV (cache, rate limit)
- ✅ Mock antes da API real
- ✅ `gpt-oss-120b` como modelo principal
- ✅ Google Drive fora do fluxo principal (fase posterior)
- ✅ Python reservado para futuros nós de GPU