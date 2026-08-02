import type { Backend, ChatRequestBody, Env, GenerationResult, StreamEvent } from '../types';

/**
 * Backend distribuído — reservado para a Fase 2.
 * Este stub será substituído pelo agente Python + vLLM nos nós de GPU voluntários.
 */
export const DistributedBackend: Backend = {
  id: 'distributed',

  async generateStream(
    request: ChatRequestBody,
    env: Env,
    send: (event: StreamEvent) => void,
  ): Promise<GenerationResult> {
    send({ type: 'status', message: 'A pesquisar nós distribuídos…' });

    // Na Fase 2, aqui será feita a consulta ao D1 (inference_nodes) e o router
    // geográfico selecionará o nó com menor latência.

    throw new Error('Rede distribuída ainda não está ativa (Fase 2).');
  },
};