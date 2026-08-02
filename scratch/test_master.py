import asyncio
import httpx
import json

async def test_engine():
    url = "http://localhost:8000/v1/chat"
    
    # Test 1: Sem deep think (Deverá usar Groq)
    print("=== TESTE 1: MODO GROQ ===")
    payload = {
        "message": "Qual é o sentido da vida em 5 palavras?",
        "use_deep_think": False
    }
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, timeout=30.0) as response:
            async for chunk in response.aiter_text():
                print(chunk, end="")
    
    print("\n\n=== TESTE 2: MODO LING-3.0 (DEEP THINK) ===")
    payload = {
        "message": "Qual é o sentido da vida em 5 palavras?",
        "use_deep_think": True
    }
    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, json=payload, timeout=30.0) as response:
            async for chunk in response.aiter_text():
                print(chunk, end="")
                
if __name__ == "__main__":
    asyncio.run(test_engine())
