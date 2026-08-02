from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
import uvicorn

app = FastAPI(title="Node Agent Inference Engine")

@app.post("/generate")
async def generate(request: Request):
    body = await request.json()
    message = body.get("message", "")
    
    # Na Fase 5 real, aqui chamaríamos a engine do vLLM
    # ex: engine = AsyncLLMEngine(...)
    # async for output in engine.generate(prompt): yield ...
    
    # Para nossa arquitetura MVP (sem baixar os 60GB), simulamos o processamento
    async def vllm_simulator():
        words = [" [", "Processado", " via", " Pipeline", " Parallelism", " no", " Nó", " Comunitário", " (vLLM", " Engine)]\n\n", "A", " sua", " mensagem", " foi:", f" '{message}'."]
        for word in words:
            await asyncio.sleep(0.1) # Simula o tempo de inferência GPU
            yield f"data: {json.dumps({'text': word})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(vllm_simulator(), media_type="text/event-stream")

if __name__ == "__main__":
    # Roda a engine de inferência na porta 8080 do voluntário
    print("Iniciando Node Agent Inference Engine (Simulação vLLM) na porta 8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
