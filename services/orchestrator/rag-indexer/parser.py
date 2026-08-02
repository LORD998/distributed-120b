import os

# Esse script futuramente vai usar bibliotecas como PyPDF2, langchain_text_splitters, etc.
# Para esta Fase 2, deixamos a estrutura pronta.

def parse_document(filepath):
    """
    Extrai o texto puro de um documento baixado do Drive.
    """
    _, ext = os.path.splitext(filepath)
    ext = ext.lower()
    
    if ext == '.txt':
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    elif ext == '.pdf':
        return "[Texto extraído do PDF (placeholder)]"
    else:
        return "[Formato não suportado]"

def chunk_text(text, chunk_size=500):
    """
    Divide o texto em blocos menores para criação dos embeddings da memória RAG.
    """
    words = text.split()
    chunks = [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
    return chunks

if __name__ == "__main__":
    print("Módulo de Parsing carregado. Pronto para processar a memória baixada.")
