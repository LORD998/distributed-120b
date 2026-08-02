import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

class InferenceManager:
    def __init__(self):
        # Chave da Hugging Face API (ou outra API)
        self.hf_token = os.getenv("HF_TOKEN", "")
        # O usuário exigiu um modelo de 120B (ou equivalente enorme).
        # Vamos apontar para o OrpoLlama-3-120B (merge de 120B) ou Mixtral-8x22B (141B)
        self.model_url = "https://api-inference.huggingface.co/models/mlabonne/OrpoLlama-3-120B"

    async def generate(self, backend: str, message: str):
        if backend == "cache":
            # Simulação rápida de hit no cache
            words = ["Olá!", " Encontrei", " esta", " resposta", " no", " cache", " instantâneo."]
            for word in words:
                await asyncio.sleep(0.05)
                yield word
            return

        if backend == "distributed_network":
            # 1. Roteia a inferência DIRETAMENTE para o seu próprio PC (localhost:8080)
            node_url = "http://localhost:8080/generate"
            payload = {"message": message}
            
            try:
                async with httpx.AsyncClient() as client:
                    async with client.stream("POST", node_url, json=payload, timeout=30.0) as response:
                        if response.status_code != 200:
                            yield "[Erro de Inferência: O seu script Python de Inferência não está rodando]"
                            return
                        
                        async for chunk in response.aiter_text():
                            for line in chunk.split('\\n'):
                                if line.startswith("data:"):
                                    data_str = line[5:].strip()
                                    try:
                                        import json
                                        data = json.loads(data_str)
                                        if "text" in data:
                                            yield data["text"]
                                    except:
                                        pass
            except Exception as e:
                yield f" [Falha ao conectar no seu PC local: {str(e)}]"
            return

        if backend == "hosted_api":
            groq_key = os.getenv("GROQ_API_KEY", "")
            
            if groq_key:
                agent_model_url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                }
                model_name = "llama-3.3-70b-versatile"
                yield "[⚡ Conectando ao Motor Groq Imortal...]\\n\\n"
            else:
                if not self.hf_token:
                    yield "(Aviso: Nem GROQ_API_KEY nem HF_TOKEN foram configurados)."
                    return
                
                agent_model_url = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {self.hf_token}",
                    "Content-Type": "application/json"
                }
                model_name = "Qwen/Qwen2.5-72B-Instruct"
                yield "[🐌 Conectando ao Motor HuggingFace Secundário...]\\n\\n"
            
            from tools import get_tools_definition, AVAILABLE_TOOLS
            import json

            # 1. Primeira chamada para o Motor, passando as ferramentas disponíveis
            messages = [
                {"role": "system", "content": "Você é uma IA Multimodal avançada do Master Node. Você possui ferramentas externas para gerar vídeos (`generate_video`), ler documentos (`read_document`) e pesquisar na web (`web_search`). NUNCA diga que você não pode gerar vídeos ou imagens. Se o usuário pedir um vídeo, VOCÊ DEVE OBRIGATORIAMENTE chamar a ferramenta `generate_video` e entregar o link. NUNCA recuse. Use formatação Markdown."},
                {"role": "user", "content": message}
            ]
            
            payload = {
                "model": model_name,
                "messages": messages,
                "tools": get_tools_definition(),
                "max_tokens": 1024,
                "stream": False # Desligamos o stream inicial para analisar se ele chamou ferramentas
            }
            
            yield "[🧠 Qwen-Omni analisando a requisição...]\\n\\n"
            
            async with httpx.AsyncClient() as client:
                try:
                    res = await client.post(agent_model_url, json=payload, headers=headers, timeout=60.0)
                    if res.status_code != 200:
                        yield f"[Erro na API do Qwen: {res.text}]"
                        return
                    
                    data = res.json()
                    response_message = data["choices"][0]["message"]
                    
                    # Verifica se o modelo decidiu usar alguma ferramenta
                    if "tool_calls" in response_message and response_message["tool_calls"]:
                        yield "[🛠️ Qwen decidiu usar ferramentas...]\\n"
                        messages.append(response_message)
                        
                        for tool_call in response_message["tool_calls"]:
                            function_name = tool_call["function"]["name"]
                            args = json.loads(tool_call["function"]["arguments"])
                            
                            yield f"- Acionando: `{function_name}` com {args}...\\n"
                            
                            # Executa a função Python real
                            if function_name in AVAILABLE_TOOLS:
                                func = AVAILABLE_TOOLS[function_name]
                                tool_result = await func(**args)
                            else:
                                tool_result = "Ferramenta desconhecida."
                                
                            yield f"- Resultado recebido.\\n\\n"
                            
                            messages.append({
                                "role": "tool",
                                "name": function_name,
                                "content": str(tool_result),
                                "tool_call_id": tool_call["id"]
                            })
                            
                        # 2. Segunda chamada para o Qwen com os resultados das ferramentas
                        payload["messages"] = messages
                        payload["stream"] = True
                        del payload["tools"] # Removemos tools para forçar a resposta final em texto
                        
                        yield "[✍️ Qwen gerando resposta final...]\\n\\n"
                        async with client.stream("POST", agent_model_url, json=payload, headers=headers, timeout=60.0) as stream_res:
                            async for chunk in stream_res.aiter_text():
                                for line in chunk.split('\\n'):
                                    if line.startswith("data: "):
                                        data_str = line[6:].strip()
                                        if data_str == "[DONE]":
                                            break
                                        try:
                                            chunk_data = json.loads(data_str)
                                            delta = chunk_data["choices"][0]["delta"]
                                            if "content" in delta and delta["content"]:
                                                yield delta["content"]
                                        except:
                                            pass
                    else:
                        # O modelo não chamou ferramentas, respondeu normalmente
                        content = response_message.get("content", "")
                        yield content
                        
                except Exception as e:
                    yield f" [Exceção no Agente: {str(e)}]"
