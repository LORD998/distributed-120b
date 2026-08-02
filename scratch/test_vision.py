import asyncio
from vision import VisionMemoryEngine
import os

# Precisamos de algumas imagens públicas.
# 1. Uma maçã
# 2. Um carro
# 3. Um cachorro
urls = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/265px-Red_Apple.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2012_Ford_Focus_SE_--_10-26-2011.jpg/280px-2012_Ford_Focus_SE_--_10-26-2011.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Labrador_Retriever_dog.jpg/300px-Labrador_Retriever_dog.jpg"
]

async def test_search():
    engine = VisionMemoryEngine()
    # Mocking the api key temporarily if not in env
    if not engine.api_key:
        engine.api_key = "MOCK_KEY_AQUI_DEPOIS"
    
    query = "um animal peludo com quatro patas"
    print(f"Buscando por: '{query}' nas imagens...")
    
    result = await engine.search_best_image(query, urls)
    print("Resultados:")
    import json
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_search())
