import os
from downloader import authenticate_gdrive

def test_connection():
    print("Testando conexão com o Google Drive...")
    drive_service = authenticate_gdrive()
    
    if not drive_service:
        print("Erro: Não foi possível autenticar. Verifique o arquivo credentials.json.")
        return
        
    print("Autenticação concluída com sucesso!")
    print("Tentando listar arquivos compartilhados com a conta de serviço...")
    
    try:
        results = drive_service.files().list(
            pageSize=10, fields="nextPageToken, files(id, name)"
        ).execute()
        
        items = results.get('files', [])
        
        if not items:
            print("Nenhum arquivo encontrado. (Isso é normal se você ainda não compartilhou nenhuma pasta do seu Drive com o email da Service Account).")
        else:
            print("Arquivos encontrados:")
            for item in items:
                print(f" - {item['name']} (ID: {item['id']})")
    except Exception as e:
        print(f"Ocorreu um erro ao acessar a API do Drive: {e}")

if __name__ == '__main__':
    test_connection()
