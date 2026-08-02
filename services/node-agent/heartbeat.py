import time
import requests
import json
import uuid
import socket
import argparse

GATEWAY_URL = "http://localhost:8787/v1/heartbeat"

def get_system_info():
    return {
        "node_id": f"gpu-node-{socket.gethostname()}-{str(uuid.uuid4())[:4]}",
        "region": "eu-central",
        "vram_gb": 24,
        "layers": [0, 1, 2, 3, 4, 5],
        "latency_ms": 15
    }

def start_heartbeat(token):
    node_info = get_system_info()
    print(f"[{node_info['node_id']}] Iniciando Heartbeat Voluntário na rede (VRAM: {node_info['vram_gb']}GB)")
    print(f"Usando token de segurança: {token[:15]}...")
    print(f"Enviando pings para {GATEWAY_URL} a cada 15 segundos...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    while True:
        try:
            response = requests.post(
                GATEWAY_URL, 
                json=node_info,
                headers=headers,
                timeout=5
            )
            if response.status_code == 200:
                print(f"[OK] Heartbeat seguro enviado com sucesso.")
            else:
                print(f"[ERROR] Gateway rejeitou (Status {response.status_code}): {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"[FALHA] Não foi possível conectar ao Gateway: {e}")
            
        time.sleep(15)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Node Agent Heartbeat')
    parser.add_argument('--token', type=str, required=True, help='Token de acesso de voluntário')
    args = parser.parse_args()
    
    start_heartbeat(args.token)
