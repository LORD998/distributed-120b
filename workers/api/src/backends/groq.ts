import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const GroqBackend: Backend = {
  id: 'groq',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    const token = env.GROQ_API_KEY;
    if (!token) {
      throw new Error('GROQ_API_KEY não configurado.');
    }

    send({ type: 'status', message: 'A contactar Groq…' });

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: env.MODEL_NAME || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: request.message }],
        stream: true,
        max_tokens: request.max_output_tokens ?? 1024,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new Error(`Erro Groq (${res.status}): ${text.slice(0, 200)}`);
    }

    send({ type: 'status', message: 'A receber resposta incrivelmente rápida…' });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';
    let outputTokens = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            content += delta;
            outputTokens++;
            send({ type: 'token', text: delta });
          }
        } catch {}
      }
    }

    return {
      content,
      inputTokens: Math.ceil(request.message.length / 4),
      outputTokens,
    };
  },
};
