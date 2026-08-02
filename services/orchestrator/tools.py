import os
import json
import httpx
import asyncio

async def web_search(query: str) -> str:
    """Ferramenta de pesquisa na internet."""
    # Simulação de busca real. Em produção, conectaria na API do DuckDuckGo ou Tavily.
    return f"[Resultado da Busca]: O termo '{query}' é altamente relevante para o futuro da IA multimodal."

async def read_document(file_name: str) -> str:
    """Ferramenta para extração de texto de documentos/PDFs."""
    return f"[Documento]: O arquivo {file_name} contém instruções secretas sobre a rede descentralizada."

async def generate_video(prompt: str) -> str:
    """
    Ferramenta para gerar vídeo usando Wan 2.2 ou LTX-2.3.
    Retorna o link (URL) do vídeo gerado.
    """
    hf_token = os.getenv("HF_TOKEN", "")
    
    # Simulação da API de Vídeo (visto que modelos Wan/LTX demoram minutos na Hugging Face real)
    # Na arquitetura real, você faria um POST para o Hugging Face Space do LTX-Video.
    await asyncio.sleep(2) # Simulando o tempo de processamento
    
    # Vamos retornar um vídeo público de exemplo para a interface poder renderizar e provar que funciona
    fake_video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    
    # O agente deve formatar isso para a UI do React entender
    return f"SUCESSO. O vídeo foi gerado com o prompt '{prompt}'. URL: {fake_video_url}"

# Dicionário mapeando os nomes para as funções executáveis
AVAILABLE_TOOLS = {
    "web_search": web_search,
    "read_document": read_document,
    "generate_video": generate_video
}

def get_tools_definition():
    """Retorna o esquema JSON das ferramentas para enviar ao LLM (Qwen)."""
    return [
        {
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Pesquisa informações em tempo real na internet.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "O termo a ser pesquisado."}
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_video",
                "description": "Gera um vídeo usando os modelos Wan 2.2 ou LTX-Video baseado num prompt de texto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "A descrição detalhada do vídeo a ser gerado."}
                    },
                    "required": ["prompt"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "read_document",
                "description": "Lê o conteúdo de um documento ou PDF fornecido pelo usuário.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_name": {"type": "string", "description": "O nome do arquivo a ser lido."}
                    },
                    "required": ["file_name"]
                }
            }
        }
    ]
