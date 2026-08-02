from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from router import route_request
from backends import InferenceManager
import json

app = FastAPI(title="Orquestrador 120B")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

inference_manager = InferenceManager()

@app.post("/v1/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    
    # Roteamento baseado em regras (Cache -> API -> Petals)
    backend_choice = route_request(user_message)
    
    async def event_generator():
        yield f"data: {json.dumps({'backend': backend_choice})}\n\n"
        
        async for token in inference_manager.generate(backend_choice, user_message):
            yield f"data: {json.dumps({'text': token})}\n\n"
            
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

from vision import VisionMemoryEngine
vision_engine = VisionMemoryEngine()

@app.post("/v1/vision/search")
async def vision_search_endpoint(request: Request):
    """
    Rota independente para a Aura Vision AI.
    Exemplo de payload:
    {
        "query": "um cachorro",
        "image_urls": ["url_gato", "url_cachorro"]
    }
    """
    body = await request.json()
    query = body.get("query", "")
    image_urls = body.get("image_urls", [])
    
    if not query or not image_urls:
        return {"error": "Envie 'query' e 'image_urls'"}
        
    try:
        result = await vision_engine.search_best_image(query, image_urls)
        return result
    except Exception as e:
        return {"error": str(e)}
