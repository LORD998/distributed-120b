import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';
import { tokenize } from './backend';

const MOCK_WORDS = [
  'Esta',
  ' é',
  ' uma',
  ' resposta',
  ' simulada',
  ' do',
  ' modelo',
  ' openai/gpt-oss-120b',
  ' em',
  ' modo',
  ' mock.',
  '\n\n',
  'Este',
  ' modo',
  ' permite',
  ' testar',
  ' todo',
  ' o',
  ' fluxo',
  ' da',
  ' interface',
  ' sem',
  ' necessidade',
  ' de',
  ' chave',
  ' de',
  ' API.',
  '\n\n',
  'Quando',
  ' configurar',
  ' o',
  ' HF_TOKEN',
  '(Hugging',
  ' Face),',
  ' as',
  ' respostas',
  ' reais',
  ' do',
  ' modelo',
  ' 120B',
  ' substituirão',
  ' este',
  ' conteúdo.',
];

export const MockBackend: Backend = {
  id: 'mock',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    send({ type: 'status', message: 'A gerar resposta simulada…' });

    const words = tokenize(MOCK_WORDS.join(' '));
    const fullText = words.join('');

    for (const word of words) {
      // Verifica cancelamento via KV (pode ser definido pela rota /cancel)
      const cancelled = await env.KV.get(`generation:cancelled:${request.conversation_id ?? 'unknown'}`);
      if (cancelled) {
        send({ type: 'status', message: 'Geração cancelada.' });
        break;
      }
      send({ type: 'token', text: word });
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return {
      content: fullText,
      inputTokens: Math.ceil(request.message.length / 4),
      outputTokens: words.length,
    };
  },
};