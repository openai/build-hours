import csv
import logging
import ast
from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, PointStruct
from config import Config
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration

# Initialize Qdrant client 
qdrant_client = QdrantClient(host=Config.QDRANT_HOST, port=Config.QDRANT_PORT)

def read_csv_data(csv_file_path: str) -> List[Dict[str, Any]]:
    """
    Reads data from a CSV file and returns a list of dictionaries.
    """
    data_entries = []
    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Convert data types as necessary
                row['price'] = float(row['price']) if row['price'] else None
                 # Parse the embedding vector from string to list of floats
                embedding_str = row.get('embedded_description')  # Replace 'embedding' with your actual column name
                if embedding_str:
                    try:
                        row['embedded_description'] = ast.literal_eval(embedding_str)
                        if not isinstance(row['embedded_description'], list):
                            logger.error(f"Embedding for row {row} is not a list.")
                            row['embedded_description'] = []
                    except (ValueError, SyntaxError) as e:
                        logger.error(f"Error parsing embedding for row {row}: {e}")
                        row['embedded_description'] = []
                else:
                    row['embedded_description'] = []
                
                data_entries.append(row)
        logger.info(f"Read {len(data_entries)} entries from {csv_file_path}")
    except Exception as e:
        logger.error(f"Error reading CSV file {csv_file_path}: {e}")
    return data_entries


def create_qdrant_collection(collection_name: str, vector_size: int, distance_metric: str = 'Cosine'):
    """
    Creates a Qdrant collection with the specified configuration.
    """
    qdrant_client.recreate_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=vector_size,
            distance=distance_metric
        )
    )
    logger.info(
        f"Collection '{collection_name}' created with vector size {vector_size} and distance metric '{distance_metric}'.")



def insert_data_into_qdrant(data_entries: List[Dict[str, Any]]):
    """
    Inserts data into the Qdrant collection using precomputed embeddings from the CSV.
    """
    points = []
    for idx, entry in enumerate(data_entries):
        embedded_description = entry.get('embedded_description')
        if not isinstance(embedded_description, list):
            if embedded_description:
                try:
                    embedded_description = ast.literal_eval(embedded_description)
                    if not isinstance(embedded_description, list):
                        logger.warning(f"Embedding for row {idx} is not a list. Keeping original value.")
                except (ValueError, SyntaxError) as e:
                    logger.error(f"Error parsing embedding for row {idx}: {e}. Keeping original value.")
            else:
                logger.warning(f"Missing embedding for row {idx}. Converting to empty list.")
                embedded_description = []
        entry['embedded_description'] = embedded_description

        point = PointStruct(
            id=idx,
            vector=embedded_description,
            payload={
                    # Start of Selection
                    "product_id": entry.get("id"),
                    "product_name": entry.get("product_name"),
                    "category": entry.get("category"),
                    "price": entry.get("price"),
                    "detailed_description": entry.get("detailed_description"),
                }
            )
        points.append(point)

        # Batch insertion
        if len(points) >= Config.BATCH_SIZE:
            try:
                qdrant_client.upsert(
                    collection_name=Config.COLLECTION_NAME,
                    points=points
                )
                logger.info(f"Inserted batch of {len(points)} points into Qdrant.")
                points = []
            except Exception as e:
                logger.error(f"Failed to upsert batch to Qdrant: {e}")

    # Insert any remaining points
    if points:
        try:
            qdrant_client.upsert(
                collection_name=Config.COLLECTION_NAME,
                points=points
            )
            logger.info(f"Inserted final batch of {len(points)} points into Qdrant.")
        except Exception as e:
            logger.error(f"Failed to upsert final batch to Qdrant: {e}")

def spin_up_qdrant_database():
    """
    Spins up the Qdrant database by creating the collection and inserting data.
    """
    create_qdrant_collection(Config.COLLECTION_NAME, Config.VECTOR_SIZE)
    data_entries = read_csv_data(Config.CSV_FILE_PATH)
    if data_entries:
        insert_data_into_qdrant(data_entries)
    else:
        logger.warning("No data entries found to insert into Qdrant.")

if __name__ == "__main__":
    spin_up_qdrant_database()