import type { Env } from '../types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'net120b_';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  try {
    const body = (await request.json()) as { volunteer_name?: string };
    if (!body.volunteer_name) {
      return json({ error: 'volunteer_name é obrigatório' }, 400);
    }

    const token = generateToken();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO authorized_tokens (token, volunteer_name, created_at) VALUES (?, ?, ?)'
    )
      .bind(token, body.volunteer_name, createdAt)
      .run();

    return json({
      status: 'ok',
      volunteer_name: body.volunteer_name,
      token: token,
      instruction: `python heartbeat.py --token ${token}`
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
