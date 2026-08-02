import os
import time
import requests
import threading
import uvicorn
import subprocess
import re

def run_uvicorn():
    # Sobe o nosso orquestrador completo que já está configurado na pasta
    uvicorn.run("main:app", host="0.0.0.0", port=8000)

def start_cloudflare_tunnel():
    print("🌐 Baixando e iniciando Cloudflare Tunnel (100% Grátis/Sem Cadastro)...")
    # No Ubuntu do GitHub Actions, baixamos o cloudflared binário
    subprocess.run("wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb", shell=True)
    
    # Inicia o túnel descartável
    process = subprocess.Popen(["cloudflared", "tunnel", "--url", "http://localhost:8000"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    public_url = None
    for line in process.stdout:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            public_url = match.group(0)
            break
            
    return public_url

if __name__ == "__main__":
    print("🚀 Iniciando Servidor GitHub Actions (Nó de Inteligência)...")
    
    GATEWAY_URL = os.environ.get("GATEWAY_URL")
    NODE_TOKEN = os.environ.get("NODE_TOKEN")
    
    if not GATEWAY_URL or not NODE_TOKEN:
        print("❌ Erro: Faltam variáveis de ambiente GATEWAY_URL ou NODE_TOKEN!")
        exit(1)
        
    # 1. Sobe o orquestrador na porta 8000
    threading.Thread(target=run_uvicorn, daemon=True).start()
    time.sleep(3) # Aguarda o servidor subir
    
    # 2. Abre o túnel Cloudflare
    public_url = start_cloudflare_tunnel()
    if not public_url:
        print("❌ Falha ao criar túnel Cloudflare.")
        exit(1)
        
    print(f"✅ Túnel Cloudflare criado com sucesso: {public_url}")
    
    # 3. Registra na rede (Cloudflare Gateway do Usuário)
    print("📡 Enviando Heartbeat para o seu Gateway...")
    headers = {
        "Authorization": f"Bearer {NODE_TOKEN}",
        "Bypass-Tunnel-Reminder": "true",
        "User-Agent": "curl/7.68.0"
    }
    payload = {
        "node_id": "github-actions-vm-01",
        "region": "github-us-east",
        "vram_gb": 7, # Representa a RAM do Github, não VRAM
        "gpu_model": "GitHub CPU Runner",
        "status": "online",
        "endpoint": public_url
    }
    
    try:
        res = requests.post(f"{GATEWAY_URL}/v1/heartbeat", json=payload, headers=headers)
        if res.status_code == 200:
            print("🎉 SUCESSO! Esta máquina virtual da Microsoft agora é sua escrava.")
            print("Os vídeos pesados e PDFs serão processados usando os recursos desta máquina e salvos no Google Drive.")
        else:
            print(f"❌ Erro de Autenticação na Rede: {res.text}")
    except Exception as e:
        print(f"❌ Erro ao contactar o Gateway: {e}")

    # Mantém a máquina viva e avisa o Gateway a cada 30 segundos
    print("\n⏳ Servidor GitHub escutando requisições. Para parar, cancele o Workflow na interface do GitHub.")
    try:
        # Loop de heartbeat por 6 horas (máximo do GitHub Actions)
        # 6 horas = 21600 segundos -> 720 repetições de 30s
        for _ in range(720):
            time.sleep(30)
            try:
                requests.post(f"{GATEWAY_URL}/v1/heartbeat", json=payload, headers=headers, timeout=5)
            except:
                pass
    except KeyboardInterrupt:
        print("Finalizando...")
