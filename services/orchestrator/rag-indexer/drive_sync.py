import os
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# Utiliza a mesma infraestrutura de credenciais do downloader,
# mas este arquivo rodaria no servidor do Orquestrador.
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), 'credentials.json')
LOCAL_DOCS_DIR = os.path.join(os.path.dirname(__file__), 'docs_cache')

def authenticate_gdrive():
    if not os.path.exists(CREDENTIALS_FILE):
        return None
    creds = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def sync_rag_documents(drive_folder_id):
    """
    Sincroniza os arquivos de texto e PDFs da sua pasta no Drive 
    para o diretório local do Orquestrador.
    """
    drive_service = authenticate_gdrive()
    if not drive_service:
        print("Credenciais não encontradas. O módulo RAG não baixará novos documentos.")
        return
        
    os.makedirs(LOCAL_DOCS_DIR, exist_ok=True)
    print("Procurando documentos na pasta da memória RAG...")
    
    results = drive_service.files().list(
        q=f"'{drive_folder_id}' in parents and trashed=false",
        fields="nextPageToken, files(id, name, modifiedTime, mimeType)"
    ).execute()
    
    items = results.get('files', [])
    if not items:
        print("Nenhum documento novo encontrado na memória.")
        return
        
    for item in items:
        # Aqui, idealmente, você também compara o 'modifiedTime' com um cache local
        # para não re-baixar documentos inalterados.
        file_path = os.path.join(LOCAL_DOCS_DIR, item['name'])
        print(f"Baixando documento de memória: {item['name']}...")
        
        request = drive_service.files().get_media(fileId=item['id'])
        fh = io.FileIO(file_path, 'wb')
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            
    print("Sincronização da memória concluída.")

if __name__ == '__main__':
    print("Iniciando RAG Drive Sync...")
    # sync_rag_documents('ID_DA_PASTA_NO_DRIVE')
