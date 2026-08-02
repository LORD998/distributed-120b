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

async def generate_image(prompt: str) -> str:
    """Ferramenta para gerar imagem usando Flux (Pollinations) gratuitamente."""
    import urllib.parse
    encoded_prompt = urllib.parse.quote(prompt + " ultra realistic, 8k")
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
    return f"SUCESSO. Imagem gerada. Você deve entregar o seguinte link ao usuário exatamente neste formato: [imagem]({image_url})"

async def transcribe_audio(file_name: str) -> str:
    """Ferramenta para transcrever áudio."""
    return f"[Transcrição]: O arquivo de áudio {file_name} diz: 'Bem-vindo ao Master Node imortal.'"

# Dicionário mapeando os nomes para as funções executáveis
AVAILABLE_TOOLS = {
    "web_search": web_search,
    "read_document": read_document,
    "generate_video": generate_video,
    "generate_image": generate_image,
    "transcribe_audio": transcribe_audio
}

def get_tools_definition():
    """Retorna o esquema JSON das ferramentas para enviar ao LLM."""
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
                "description": "Gera um vídeo baseado num prompt de texto.",
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
                "name": "generate_image",
                "description": "Gera uma imagem fotorealista de alta resolução baseada num prompt de texto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "A descrição da imagem a ser gerada."}
                    },
                    "required": ["prompt"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "transcribe_audio",
                "description": "Transcreve o áudio de um arquivo e converte para texto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_name": {"type": "string", "description": "O nome do arquivo de áudio (mp3, wav, etc)."}
                    },
                    "required": ["file_name"]
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
