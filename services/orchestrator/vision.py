import os
import httpx
import math
from typing import List, Dict, Any

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    if len(vec1) != len(vec2):
        raise ValueError("Vetores de tamanhos diferentes")
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

class VisionMemoryEngine:
    def __init__(self):
        # Usamos uma chave fornecida pelo usuário ou pegamos do ambiente
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.url = "https://openrouter.ai/api/v1/embeddings"
        self.model = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
    
    async def get_embedding(self, content_list: List[Dict[str, Any]]) -> List[float]:
        """
        content_list deve seguir o formato:
        [
            {"type": "text", "text": "What is in this image?"},
            {"type": "image_url", "image_url": {"url": "https://..."}}
        ]
        """
        if not self.api_key:
            raise Exception("OPENROUTER_API_KEY não está configurada. Obtenha em https://openrouter.ai/settings/keys")
            
        payload = {
            "model": self.model,
            "input": [
                {
                    "content": content_list
                }
            ],
            "encoding_format": "float"
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.url, json=payload, headers=headers, timeout=60.0)
            
            if response.status_code != 200:
                raise Exception(f"Erro na API OpenRouter: {response.text}")
                
            data = response.json()
            return data["data"][0]["embedding"]

    async def get_text_embedding(self, text: str) -> List[float]:
        return await self.get_embedding([{"type": "text", "text": text}])

    async def get_image_embedding(self, image_url: str) -> List[float]:
        return await self.get_embedding([{"type": "image_url", "image_url": {"url": image_url}}])

    async def search_best_image(self, query: str, image_urls: List[str]) -> Dict[str, Any]:
        """
        Pega uma string de busca e uma lista de imagens, retorna a URL com maior similaridade.
        """
        if not image_urls:
            return {"error": "Nenhuma imagem fornecida"}
            
        # 1. Embeda a query
        query_vec = await self.get_text_embedding(query)
        
        # 2. Embeda todas as imagens
        best_match = None
        best_score = -1.0
        results = []
        
        for url in image_urls:
            try:
                img_vec = await self.get_image_embedding(url)
                score = cosine_similarity(query_vec, img_vec)
                results.append({"url": url, "score": score})
                
                if score > best_score:
                    best_score = score
                    best_match = url
            except Exception as e:
                print(f"Erro ao analisar a imagem {url}: {e}")
                
        return {
            "best_match": best_match,
            "score": best_score,
            "all_results": sorted(results, key=lambda x: x["score"], reverse=True)
        }
