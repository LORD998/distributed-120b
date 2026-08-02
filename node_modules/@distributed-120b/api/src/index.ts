import type { Env } from './types';
import { handleChat } from './routes/chat';
import { handleStatus } from './routes/status';
import { handleConversations } from './routes/conversations';
import { handleCancel, handleNodes } from './routes/nodes';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      let response: Response;

      switch (true) {
        case url.pathname === '/v1/chat':
          response = await handleChat(request, env);
          break;

        case url.pathname === '/v1/status' && request.method === 'GET':
          response = await handleStatus(env);
          break;

        case url.pathname.startsWith('/v1/conversations'):
          response = await handleConversations(request, env);
          break;

        case url.pathname === '/v1/register':
          const { handleRegister } = await import('./routes/register');
          response = await handleRegister(request, env);
          break;

        case url.pathname === '/v1/heartbeat' || url.pathname === '/v1/nodes':
          response = await handleNodes(request, env);
          break;

        case url.pathname.startsWith('/v1/generations/'):
          response = await handleCancel(request, env);
          break;

        case url.pathname === '/':
          response = new Response(
            JSON.stringify({
              service: 'distributed-120b-api',
              version: '0.1.0',
              endpoints: [
                'POST /v1/chat',
                'GET /v1/status',
                'GET /v1/conversations',
                'GET /v1/conversations/:id',
                'PUT /v1/conversations/:id',
                'DELETE /v1/conversations/:id',
                'POST /v1/generations/:request_id/cancel',
                'POST /v1/heartbeat',
                'GET /v1/nodes',
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
          break;

        default:
          response = new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }

      // Adiciona headers CORS
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Erro interno',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        },
      );
    }
  },
};