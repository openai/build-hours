import os

class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    QDRANT_HOST = 'localhost'
    QDRANT_PORT = 6333
    CSV_FILE_PATH = "upload-data/fake_hardware_data.csv"
    COLLECTION_NAME = "fake_hardware_data"
    EMBEDDING_MODEL = "text-embedding-3-small"  
    VECTOR_SIZE = 1536  
    MAX_WORKERS = 100  
    BATCH_SIZE = 100 
