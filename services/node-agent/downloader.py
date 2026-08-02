import os
import hashlib
import json
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from tqdm import tqdm

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
CREDENTIALS_FILE = 'credentials.json'

def authenticate_gdrive():
    if not os.path.exists(CREDENTIALS_FILE):
        print(f"Erro: Arquivo {CREDENTIALS_FILE} não encontrado.")
        print("Para esta Fase 2 funcionar, você precisa criar uma Service Account no Google Cloud e colocar o JSON aqui.")
        return None
    creds = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def compute_sha256(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Lê em blocos para não estourar a RAM
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def download_file(drive_service, file_id, file_name, destination_folder, expected_checksum=None):
    os.makedirs(destination_folder, exist_ok=True)
    filepath = os.path.join(destination_folder, file_name)
    
    # Pula o download se já existe e o checksum bate
    if os.path.exists(filepath) and expected_checksum:
        print(f"[{file_name}] Arquivo existe localmente. Verificando SHA256...")
        local_checksum = compute_sha256(filepath)
        if local_checksum == expected_checksum:
            print(f"[{file_name}] Checksum validado. Não é necessário fazer download.")
            return True
        else:
            print(f"[{file_name}] Checksum não bate (Local: {local_checksum[:8]}... | Esperado: {expected_checksum[:8]}...). Refazendo download.")
    
    print(f"[{file_name}] Iniciando download do Google Drive...")
    request = drive_service.files().get_media(fileId=file_id)
    fh = io.FileIO(filepath, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    
    done = False
    with tqdm(desc=file_name, unit="B", unit_scale=True, unit_divisor=1024) as pbar:
        while done is False:
            status, done = downloader.next_chunk()
            if status:
                pbar.update(int(status.resumable_progress - pbar.n))
    
    # Verificação pós-download
    if expected_checksum:
        print(f"[{file_name}] Verificando integridade pós-download...")
        local_checksum = compute_sha256(filepath)
        if local_checksum == expected_checksum:
            print(f"[{file_name}] Download concluído com sucesso e verificado!")
            return True
        else:
            print(f"[{file_name}] Erro: Arquivo corrompido! O checksum falhou.")
            os.remove(filepath)
            return False
            
    return True

def sync_model_fragments(folder_id):
    """
    Função principal que um nó chama ao ligar. 
    1. Lê manifest.json do Drive (contém IDs e checksums)
    2. Baixa as partes que foram atribuídas a este nó.
    """
    drive_service = authenticate_gdrive()
    if not drive_service: return
    
    print("Conectado ao Google Drive com sucesso. Procurando manifest.json...")
    # NOTA: Na fase 2 de MVP, você vai colocar os File IDs corretos aqui após fazer upload de testes.
    # Exemplo simulado:
    print("Sincronização iniciada. (Substitua pelos IDs reais quando os pesos de teste forem upados)")

if __name__ == '__main__':
    # Uso de exemplo:
    print("Iniciando Node Agent Downloader...")
    # sync_model_fragments('SEU_FOLDER_ID_NO_DRIVE')
