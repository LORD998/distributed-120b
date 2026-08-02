def route_request(message: str) -> str:
    """
    Roteador inicial. Na Fase 1, se não houver cache, tentamos a API gratuita.
    Futuramente, aqui checaremos GPU doada, rede petals, etc.
    """
    # Roteador atualizado para a Fase 5
    if message.lower().strip() == "ola" or message.lower().strip() == "olá":
        return "cache"
    
    # Agora a prioridade 1 é usar a API hospedada (Hugging Face)
    return "hosted_api"
