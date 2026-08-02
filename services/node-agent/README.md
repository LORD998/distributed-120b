# Node Agent — Reservado (Fase 2)

Este diretório está **reservado** para o agente Python dos nós de GPU voluntários na Fase 2.

## Objetivo (Fase 2)

- Registar GPUs voluntárias na rede `distributed-120b`.
- Enviar heartbeats para `POST /v1/heartbeat` do Worker.
- Servir inferência com vLLM e `openai/gpt-oss-120b`.
- Relatar VRAM, região, latência e estado de saúde.
- Participar no router geográfico e no scheduler.

## Stack planeada

```text
Python
FastAPI
vLLM
Uvicorn
Comunicação segura com o Worker via token
```

## Estado

Nenhum código nesta fase. A infraestrutura já está preparada no Worker:

- Tabela `inference_nodes` no D1.
- Rotas `POST /v1/heartbeat` e `GET /v1/nodes`.
- Backend `distributed.ts` (stub).
- Seleção de backend: nó saudável → Hugging Face → mock.