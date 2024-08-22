# %%

import os
import re
import base64
import io
import json
import logging
import argparse
from typing import Dict, List, Tuple, Any
from PIL import Image
import fitz  # PyMuPDF
from concurrent.futures import ThreadPoolExecutor
from schema_definitions import schema_dict
from database import get_database_info
from config import TRIAGE_SYSTEM_PROMPT
import sqlite3
from openai import OpenAI
import qdrant_client
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import VectorParams, Distance

# %%

## docker run -d -p 6333:6333 qdrant/qdrant

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# %%

# Configuration
class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    QDRANT_HOST = 'localhost'
    QDRANT_PORT = 6333
    SLIDES_FOLDER = "./earnings_reports_sample"
    TABLE_JSON_FOLDER = "./table_json"
    BASE64_OUTPUT_FOLDER = "./base64_images"
    COLLECTION_NAME = "image_embeddings"
    EMBEDDING_MODEL = "text-embedding-3-small"
    GPT_MODEL = "gpt-4o-2024-08-06"

# Initialize clients
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
qdrant_client = QdrantClient(host=Config.QDRANT_HOST, port=Config.QDRANT_PORT)

def encode_image(image: Image) -> str:
    """
    Encodes a PIL Image into a base64 string.
    """
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str

def pdf_to_base64_images(pdf_path: str) -> List[str]:
    """
    Converts each page of a PDF into a base64-encoded PNG image.
    """
    try:
        pdf_document = fitz.open(pdf_path)
        base64_images = []

        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            pix = page.get_pixmap()
            img = Image.open(io.BytesIO(pix.tobytes()))
            base64_image = encode_image(img)
            base64_images.append(base64_image)

        logger.info(f"Processed {len(base64_images)} pages from {pdf_path}")
        return base64_images

    except Exception as e:
        logger.error(f"Error processing PDF {pdf_path}: {e}")
        return []

def save_base64_image(base64_image: str, folder: str, filename: str) -> str:
    """
    Saves a base64 encoded image to a file and returns the file path.
    """
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, filename)
    with open(file_path, "w") as f:
        f.write(base64_image)
    return file_path

def process_folder(folder: str, base64_output_folder: str) -> List[Dict[str, str]]:
    """
    Processes all PDFs in a folder and extracts base64 images along with their quarter information.
    """
    images_data = []
    quarter_pattern = r'Q[1-4]\d{2}'

    for file in os.listdir(folder):
        if file.endswith(".pdf"):
            match = re.search(quarter_pattern, file)
            if match:
                quarter_info = match.group()
                pdf_path = os.path.join(folder, file)
                base64_images = pdf_to_base64_images(pdf_path)
                for i, base64_image in enumerate(base64_images):
                    base64_filename = f"{os.path.splitext(file)[0]}_page_{i}.txt"
                    base64_path = save_base64_image(base64_image, base64_output_folder, base64_filename)
                    images_data.append({
                        'quarter_info': quarter_info, 
                        'base64_image_path': base64_path,
                        'original_pdf_path': pdf_path
                    })
            else:
                logger.warning(f"No quarter information found in filename: {file}")
    return images_data

def analyze_image(base64_image: str, quarter_info: str) -> Dict:
    system_prompt = f"""
    Analyze the image below and determine if it contains graphs or tabular data. 

    - If the image contains a table:
    - Shorten the table title to one of ["Free_Cash_Flow_Reconciliation", "Free_Cash_Flow_Less_Principal_Repayments", "Free_Cash_Flow_Less_Equipment_Finance Leases"].
    - Transcribe the table's title under the "content_output" key.
    - Set "image_category" to "table".

    - If the image contains graphs:
    - Set "image_category" to "graphs".
    - Provide a detailed analysis/summary of the graphs, including:
        - **Descriptions** of what each graph represents.
        - **Key data points** presented as bullet points or numbered lists.
        - **Insights or takeaways or trends** derived from the graphs.

    The quarter information is: {quarter_info}. Please use that as the value for the JSON key "quarter_info".
    """
    response = client.chat.completions.create(
        model=Config.GPT_MODEL,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "image_analysis",
                "schema": {
                    "type": "object",
                    "properties": {
                        "image_category": {"type": "string"},
                        "content_output": {"type": "string"},
                        "quarter_info": {"type": "string"}
                    },
                    "required": ["image_category", "content_output", "quarter_info"],
                    "additionalProperties": False
                },
                "strict": True
            }
        },
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}", "detail": "high"}}
                ]
            }
        ],
        temperature=0.0,
    )
    response_string = response.choices[0].message.content
    response_dict = json.loads(response_string)
    return response_dict


def parse_table(base64_image: str, table_title: str, report_date: str) -> Dict:
    """
    Parses a table from an image, formats it according to a predefined JSON schema,
    and saves the resulting JSON to the TABLE_JSON_FOLDER.
    """
    relevant_schema = schema_dict.get(table_title)

    if relevant_schema is None:
        logger.warning(f"No schema found for table title: {table_title}")
        return {}

    # Convert the schema to a formatted JSON string
    system_prompt = f"""
    You are an AI assistant tasked with extracting and structuring data from images containing tables.

    **Instructions:**
    - Extract all data from the provided table image.
    - Format the extracted data according to the JSON schema provided below.
    - Ensure that all fields are correctly populated and adhere strictly to the schema specifications.
    - Use the following values for additional fields:
      - `"title"`: "{table_title}"
      - `"report_date"`: "{report_date}"

    **Output Format:**
    - Provide the output strictly in JSON format without any additional text or explanations.
    """

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Please extract and format the data from the following table image according to the provided JSON schema."},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}", "detail": "high"}}
            ]
        }
    ]

    try:
        response = client.chat.completions.create(
            model=Config.GPT_MODEL,
            response_format=relevant_schema,
            messages=messages,
            temperature=0.0
        )

        response_json = json.loads(response.choices[0].message.content)

        os.makedirs(Config.TABLE_JSON_FOLDER, exist_ok=True)
        filename = f"{table_title}_{report_date}.json".replace(" ", "_")
        file_path = os.path.join(Config.TABLE_JSON_FOLDER, filename)
        with open(file_path, 'w') as json_file:
            json.dump(response_json, json_file, indent=4)
        logger.info(f"Saved parsed table JSON to {file_path}")

        return response_json
    except Exception as e:
        logger.error(f"Error in parse_table: {e}")
        return {}

def process_single_image(image_data: Dict[str, str]) -> Dict:
    """
    Processes a single image: analyzes it and, if it's a table, parses it.
    """
    with open(image_data['base64_image_path'], 'r') as f:
        base64_image = f.read()
    quarter_info = image_data['quarter_info']
    analysis = analyze_image(base64_image, quarter_info)

    if not analysis:
        return {}

    analysis['base64_image_path'] = image_data['base64_image_path']
    analysis['original_pdf_path'] = image_data['original_pdf_path']

    if analysis.get('image_category') == 'table':
        table_title = analysis['content_output']
        parsed_data = parse_table(base64_image, table_title, quarter_info)
        analysis['parsed_table_data'] = parsed_data

    return analysis

def process_images_concurrently(images_data: List[Dict[str, str]]) -> List[Dict]:
    """
    Processes all images concurrently using ThreadPoolExecutor.
    """
    with ThreadPoolExecutor() as executor:
        results = list(executor.map(process_single_image, images_data))
    return results

def get_embedding(text: str, model: str = Config.EMBEDDING_MODEL) -> List[float]:
    """
    Retrieves the embedding for the provided text using OpenAI's embedding model.
    """
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

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
    logger.info(f"Collection '{collection_name}' created with vector size {vector_size} and distance metric '{distance_metric}'.")

def insert_data_to_qdrant(
    client: QdrantClient,
    collection_name: str,
    embeddings: List[List[float]],
    payloads: List[Dict],
    ids: List[int] = None
):
    """
    Inserts embeddings and their associated payloads into the specified Qdrant collection.
    """
    if ids is None:
        ids = list(range(len(embeddings)))
    
    points = [
        models.PointStruct(
            id=idx,
            vector=embedding,
            payload=payload
        )
        for idx, embedding, payload in zip(ids, embeddings, payloads)
    ]
    
    client.upsert(
        collection_name=collection_name,
        points=points
    )
    logger.info(f"Inserted {len(points)} records into collection '{collection_name}'.")

def query_qdrant(
    query: str,
    collection_name: str,
    top_k: int = 1,
    embedding_model: str = Config.EMBEDDING_MODEL
) -> List[Tuple[str, str, str, str]]:
    """
    Queries the Qdrant collection with the provided query string and returns the top_k results.
    """
    embedded_query = get_embedding(query, model=embedding_model)
    
    search_results = qdrant_client.search(
        collection_name=collection_name,
        query_vector=embedded_query,
        limit=top_k
    )
    
    output = []
    for result in search_results:
        payload = result.payload
        title = f"{payload['image_category']} - {payload['quarter_info']}"
        text = payload['content_output']
        base64_image_path = payload['base64_image_path']
        original_pdf_path = payload['original_pdf_path']
        output.append((title, text, base64_image_path, original_pdf_path))
    
    return output

def ask_database(conn, query):
    """Function to query SQLite database with a provided SQL query."""
    try:
        results = str(conn.execute(query).fetchall())
    except Exception as e:
        results = f"query failed with error: {e}"
    return results


conn = sqlite3.connect("./earnings.db")
print("Opened database successfully")

database_schema_dict = get_database_info(conn)
database_schema_string = "\n".join(
    [
        f"Table: {table['table_name']}\nColumns: {', '.join(table['column_names'])}"
        for table in database_schema_dict
    ]
)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "ask_database",
            "description": "Use this function to retrieve structured financial data from the SQL database. Input should be a fully formed SQL query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": f"""
                            SQL query extracting the necessary information to answer the user's question.
                            The SQL query should be written using the following database schema:
                            {database_schema_string}
                            Ensure the query is syntactically correct and returns the data needed to fully address the user's request.
                            The query should be returned in plain text, not in JSON.
                        """,
                    }
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_qdrant",
            "description": "Use this function to handle queries that require semantic understanding or retrieval from unstructured data sources using vector embeddings. Suitable for complex questions, trend analyses, and contextual information not directly available in the SQL database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "A detailed and clear version of the user's original query capturing the intent and context of the information being sought.",
                    },
                    "filter": {
                        "type": "string",
                        "description": "Optional. Specific keywords or phrases to narrow down the search results for more precise retrieval. Should consist of 2 or 3 relevant words. Leave empty if no specific filter is needed.",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Optional. The number of top relevant results to retrieve. Use higher numbers (e.g., 50) for broader queries requiring extensive information. Defaults to 10 if not specified.",
                        "default": 1,
                    },
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        }
    }
]


 


class RAGSystem:
    def __init__(self):
        self.collection_name = Config.COLLECTION_NAME

    def process_folder(self):
        images_data = process_folder(Config.SLIDES_FOLDER, Config.BASE64_OUTPUT_FOLDER)
        if not images_data:
            logger.info("No images to process.")
            return None
        return images_data

    def analyze_images(self, images_data):
        image_categorizations = process_images_concurrently(images_data)
        logger.info(f"Processed {len(image_categorizations)} images.")
        return [item for item in image_categorizations if item]

    def prepare_data_for_indexing(self, image_categorizations):
        non_table_images = [item for item in image_categorizations if item.get('image_category') != 'table']
        if not non_table_images:
            logger.info("No non-table images to process.")
            return None, None

        texts = [item['content_output'] for item in non_table_images]
        embeddings = [get_embedding(text) for text in texts]
        payloads = [
            {
                "image_category": item['image_category'],
                "content_output": item['content_output'],
                "quarter_info": item['quarter_info'],
                "base64_image_path": item['base64_image_path'],
                "original_pdf_path": item['original_pdf_path']
            }
            for item in non_table_images
        ]
        return embeddings, payloads

    def create_and_populate_collection(self, embeddings, payloads):
        vector_size = len(embeddings[0])
        create_qdrant_collection(self.collection_name, vector_size)
        insert_data_to_qdrant(qdrant_client, self.collection_name, embeddings, payloads)

    def query(self, query_text: str, top_k: int = 1) -> List[Tuple[str, str, str, str]]:
        return query_qdrant(query_text, top_k)
    
    def generate_response(self, query: str, retrieved_results: List[Tuple[str, str, str, str]]) -> str:
        system_prompt = """You are an AI assistant specializing in analyzing financial documents and graphs. 
        Use the provided information and images to answer the user's query accurately and concisely."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [{"type": "text", "text": query}]}
        ]

        for title, text, base64_image_path, _ in retrieved_results:
            with open(base64_image_path, 'r') as f:
                base64_image = f.read()
            
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Title: {title}\nContent: {text}"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            })

        response = client.chat.completions.create(
            model=Config.GPT_MODEL,
            messages=messages,
            max_tokens=300,
            temperature=0.5
        )

        return response.choices[0].message.content


def process_and_index_data():
    """
    Processes PDFs, extracts images, analyzes them, generates embeddings, and indexes them into Qdrant.
    """
    rag_system = RAGSystem()
    images_data = rag_system.process_folder()
    if images_data:
        image_categorizations = rag_system.analyze_images(images_data)
        embeddings, payloads = rag_system.prepare_data_for_indexing(image_categorizations)
        if embeddings and payloads:
            rag_system.create_and_populate_collection(embeddings, payloads)
            logger.info("Data processing and indexing completed successfully.")
        else:
            logger.warning("No embeddings or payloads generated for indexing.")
    else:
        logger.warning("No images data found for processing.")


def query_qdrant(query: str, top_k: int = 1) -> str:
    """Query Qdrant to retrieve relevant documents based on the query."""
    try:
        embedding = get_embedding(query)
        if not embedding:
            return "Failed to retrieve embedding for the query."
        
        search_result = qdrant_client.search(
            collection_name=Config.COLLECTION_NAME,
            query_vector=embedding,
            limit=top_k
        )
        
        output = []
        for result in search_result:
            payload = result.payload
            title = f"{payload['image_category']} - {payload['quarter_info']}"
            text = payload['content_output']
            base64_image_path = payload['base64_image_path']
            original_pdf_path = payload['original_pdf_path']
            output.append((title, text, base64_image_path, original_pdf_path))
        
        return output

    except Exception as e:
        logger.error(f"Qdrant query failed: {e}")
        return f"Error querying Qdrant: {e}"
    

def query_rag_system(user_query):
    """
    Starts an interactive query loop for retrieving and responding to user queries.
    """
    rag_system = RAGSystem()
    results = rag_system.query(user_query)
    if results:
        for title, text, base64_image_path, original_pdf_path in results:
            logger.info(f"Title: {title}")
            logger.info(f"Content: {text}")
            logger.info(f"Base64 Image Path: {base64_image_path}")
            logger.info(f"Original PDF Path: {original_pdf_path}")
            logger.info("---")

            # Generate response with retrieved information and images
            response = rag_system.generate_response(user_query, results)
            return response




def main_loop():
    """Interactive loop for processing user queries."""
    print("Welcome to the Financial Assistant. Type 'exit' to quit.\n")
    
    process_and_index_data()
    while True:
        user_query = input("User: ")
        if user_query.lower() in ["exit", "quit"]:
            print("Exiting the assistant. Goodbye!")
            break
        
        messages = [
            {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ]
        
        response = client.chat.completions.create(
                model='gpt-4o', 
                messages=messages, 
                tools= TOOLS, 
                tool_choice="required")
        

        # Step 2: determine if the response from the model includes a tool call.   
        tool_calls = response.choices[0].message.tool_calls
        if tool_calls:
            # If true the model will return the name of the tool / function to call and the argument(s)  
            tool_call_id = tool_calls[0].id
            tool_function_name = tool_calls[0].function.name
            tool_query_string = json.loads(tool_calls[0].function.arguments)['query']

            # Step 3: Call the function and retrieve results. Append the results to the messages list.      
            if tool_function_name == 'ask_database':
                results = ask_database(conn, tool_query_string)
                
                messages.append({
                    "role":"tool", 
                    "tool_call_id":tool_call_id, 
                    "name": tool_function_name, 
                    "content":results
                })
            elif tool_function_name == 'query_qdrant':
                results= query_rag_system(user_query)

            print (results)    
            

if __name__ == "__main__":
    main_loop()