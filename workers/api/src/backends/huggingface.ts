import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';

const HF_INFERENCE_URL = 'https://router.huggingface.co/v1/chat/completions';

/**
 * Backend Hugging Face Inference Providers.
 * Chama openai/gpt-oss-120b com stream=true e encaminha os blocos.
 */
export const HuggingFaceBackend: Backend = {
  id: 'huggingface',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    const token = env.HF_TOKEN;
    if (!token) {
      throw new Error('HF_TOKEN não configurado. Use o modo mock ou defina o secret.');
    }

    send({ type: 'status', message: 'A contactar o modelo 120B…' });

    const res = await fetch(HF_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: env.MODEL_NAME || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: request.message }],
        stream: true,
        max_tokens: request.max_output_tokens ?? 512,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new Error(`Erro do fornecedor (${res.status}): ${text.slice(0, 200)}`);
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

      // Processa linhas SSE do formato OpenAI
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
        } catch {
          // ignora blocos inválidos
        }
      }
    }

    return {
      content,
      inputTokens: Math.ceil(request.message.length / 4),
      outputTokens,
    };
  },
};