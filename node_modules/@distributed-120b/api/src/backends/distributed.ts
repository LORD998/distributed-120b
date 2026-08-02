import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';
import { findHealthyDistributedNode } from '../services/database';

export const DistributedBackend: Backend = {
  id: 'distributed',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    send({ type: 'status', message: 'Conectando ao nó distribuído na Microsoft...' });

    const node = await findHealthyDistributedNode(env);
    if (!node || !node.endpoint) {
      throw new Error('Nenhum nó saudável encontrado.');
    }

    const lastMessage = request.messages[request.messages.length - 1].content;
    const body = { message: lastMessage };

    const res = await fetch(`${node.endpoint}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Nó distribuído falhou: ${res.status}`);
    }

    // Processamento do Server-Sent Events (SSE)
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Falha ao ler stream do nó.');
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.text) {
              content += data.text;
              send({ type: 'token', content: data.text });
            }
          } catch (e) {}
        }
      }
    }

    return {
      content,
      backend: 'distributed',
      model: 'openai/gpt-oss-120b',
    };
  },
};