import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const OpenRouterBackend: Backend = {
  id: 'openrouter',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    const token = env.OPENROUTER_API_KEY;
    if (!token) {
      throw new Error('OPENROUTER_API_KEY não configurado.');
    }

    send({ type: 'status', message: 'A contactar OpenRouter…' });

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: env.MODEL_NAME || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: request.message }],
        stream: true,
        max_tokens: request.max_output_tokens ?? 512,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new Error(`Erro OpenRouter (${res.status}): ${text.slice(0, 200)}`);
    }

    send({ type: 'status', message: 'A receber resposta…' });

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
