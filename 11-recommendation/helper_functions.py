import json
import logging

from enum import Enum
from typing import Any, Dict, List

from openai import OpenAI
from pydantic import BaseModel
from qdrant_client import QdrantClient, models

from config import Config



openai_client = OpenAI()  # Corrected client initialization
qdrant_client = QdrantClient(host=Config.QDRANT_HOST, port=Config.QDRANT_PORT)
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


## Both Pages:  User Info

def get_past_purchases() -> List[Dict[str, Any]]:
    """
    Get illustrative example records for past purchases.
    :return: A list of dictionaries representing the selected records.
    """

    # Illustrative example records
    selected_records = [
        {
            "id": "c7cf3894-047d-4fa7-8aff-048dea35d829",
            "product_name": "NatureShield Primer",
            "category": "Paint: Primers and Sealers",
            "price": 457.0,
            "quantity": 3
        },
        {
            "id": "29aa07ab-7244-431b-9c0e-471f89410ab4",
            "product_name": "NatureFlow Sinks",
            "category": "Plumbing: Toilets and Sinks",
            "price": 295.05,
            "quantity": 3
        },
        {
            "id": "0d0719ff-e648-4141-b0d0-ea1b6281bcee",
            "product_name": "MightyShield Primer",
            "category": "Paint: Primers and Sealers",
            "price": 52.87,
            "quantity": 5
        },
        {
            "id": "046bd7a6-9e90-4504-8de8-173547e9b94c",
            "product_name": "Patio Paradise Side Table",
            "category": "Outdoor: Patio Furniture",
            "price": 138.61,
            "quantity": 3
        },
        {
            "id": "aef642a4-d568-4d6a-9033-413d1f2799bf",
            "product_name": "Rustic Birdhouse Haven",
            "category": "Gardening: Garden Décor",
            "price": 473.65,
            "quantity": 4
        },
        {
            "id": "741f0f31-1704-4a8d-acdc-db5e33191544",
            "product_name": "Mountain Ash Framing Lumber",
            "category": "Building Materials: Lumber",
            "price": 129.77,
            "quantity": 5
        },
        {
            "id": "3164fcac-b899-4d0e-a1b1-d041e3d1cfb2",
            "product_name": "Western Hemlock Studs",
            "category": "Building Materials: Lumber",
            "price": 367.9,
            "quantity": 3
        },
        {
            "id": "58dc13e8-c3cb-4e46-9d51-3db6ec47da6b",
            "product_name": "RustShield Coating",
            "category": "Paint: Spray Paint",
            "price": 60.95,
            "quantity": 1
        },
        {
            "id": "351492d2-cbc2-4d18-8aee-9b29b51a8a1d",
            "product_name": "Nature's Shine Outdoor Cleaner",
            "category": "Cleaning: Cleaning Supplies",
            "price": 35.01,
            "quantity": 5
        },
        {
            "id": "c0265608-02df-48ee-b73b-c5fdfe13691a",
            "product_name": "Multi-Purpose Garden Hoe",
            "category": "Tools: Garden Tools",
            "price": 76.45,
            "quantity": 3
        },
        {
            "id": "89b82f64-1b31-4909-b3c6-6d08bd8c2105",
            "product_name": "Rustic Charm Fire Pit Table",
            "category": "Outdoor: Patio Furniture",
            "price": 165.69,
            "quantity": 2
        },
        {
            "id": "3772630e-7e49-4e86-a9de-430cfdcbeb1e",
            "product_name": "Sunset Sensor Dusk Switch",
            "category": "Electrical: Switches and Outlets",
            "price": 68.38,
            "quantity": 4
        },
        {
            "id": "decc05c1-266c-4cd2-8202-28535e7bf6da",
            "product_name": "All-Weather Mounting Bracket",
            "category": "Hardware: Brackets and Supports",
            "price": 467.67,
            "quantity": 3
        },
        {
            "id": "3ed54c59-0cab-4a94-8909-9eba38b7f790",
            "product_name": "Green Thumb Organic Soil Blend",
            "category": "Gardening: Soil and Fertilizers",
            "price": 34.76,
            "quantity": 4
        },
        {
            "id": "d0e0ce3f-e0e8-4d31-8b94-8ff7507ff1ad",
            "product_name": "ToughTex Sheet",
            "category": "Building Materials: Drywall",
            "price": 112.69,
            "quantity": 5
        },
        {
            "id": "25ad7bf6-984a-4f53-9eff-df22e1ef7552",
            "product_name": "GreenGuard Patio Wash",
            "category": "Cleaning: Cleaning Supplies",
            "price": 51.74,
            "quantity": 4
        },
        {
            "id": "bde38688-b06d-4779-9515-12584f56eb7c",
            "product_name": "Tropical Touch",
            "category": "Paint: Interior Paint",
            "price": 100.19,
            "quantity": 2
        },
        {
            "id": "cc3cae31-29e0-4709-a2a3-2117434e8f2a",
            "product_name": "Sentinel Fire Control System",
            "category": "Safety: Fire Extinguishers",
            "price": 228.48,
            "quantity": 5
        },
        {
            "id": "c7a992f8-8ad9-43a2-ae09-ef627f9342a9",
            "product_name": "Outdoor Performance Wire",
            "category": "Electrical: Wiring and Cables",
            "price": 391.79,
            "quantity": 4
        },
        {
            "id": "957672ba-e285-4cb7-8f2c-c664dc72627b",
            "product_name": "SnapLock Compression Fittings",
            "category": "Plumbing: Pipes and Fittings",
            "price": 398.9,
            "quantity": 5
        },
        {
            "id": "fdf13694-6c23-4713-a89f-534acab02f48",
            "product_name": "EcoSpray Adjustable Nozzle",
            "category": "Gardening: Irrigation Supplies",
            "price": 338.54,
            "quantity": 3
        },
        {
            "id": "5412952b-3502-467a-8b57-f8b55577cdb3",
            "product_name": "HydroWave Drip Regulators",
            "category": "Gardening: Irrigation Supplies",
    "price": 297.63,
    "quantity": 4
  },
  {
    "id": "63a1ad77-2de3-4f82-82fe-872610487bb4",
    "product_name": "TrailReady First Aid Supply",
    "category": "Safety: First Aid Supplies",
    "price": 337.96,
    "quantity": 4
  }
]

    logger.info(f"Manually selected {len(selected_records)} illustrative example records.")

    return selected_records


###  Page 1: 

## Expand Query
# Structured Outputs to limit the LLM's response to specific categoriess

# 
class CategoryEnum(Enum):
    TOOLS_HAND_TOOLS = "Tools: Hand Tools"
    TOOLS_POWER_TOOLS = "Tools: Power Tools"
    TOOLS_GARDEN_TOOLS = "Tools: Garden Tools"
    TOOLS_MEASURING_TOOLS = "Tools: Measuring Tools"
    HARDWARE_FASTENERS = "Hardware: Fasteners"
    HARDWARE_HINGES = "Hardware: Hinges"
    HARDWARE_LOCKS_LATCHES = "Hardware: Locks and Latches"
    HARDWARE_BRACKETS_SUPPORTS = "Hardware: Brackets and Supports"
    PAINT_INTERIOR_PAINT = "Paint: Interior Paint"
    PAINT_EXTERIOR_PAINT = "Paint: Exterior Paint"
    PAINT_PRIMERS_SEALERS = "Paint: Primers and Sealers"
    PAINT_SPRAY_PAINT = "Paint: Spray Paint"
    BUILDING_MATERIALS_LUMBER = "Building Materials: Lumber"
    BUILDING_MATERIALS_PLYWOOD = "Building Materials: Plywood"
    BUILDING_MATERIALS_DRYWALL = "Building Materials: Drywall"
    BUILDING_MATERIALS_INSULATION = "Building Materials: Insulation"
    PLUMBING_PIPES_FITTINGS = "Plumbing: Pipes and Fittings"
    PLUMBING_FAUCETS_FIXTURES = "Plumbing: Faucets and Fixtures"
    PLUMBING_TOILETS_SINKS = "Plumbing: Toilets and Sinks"
    PLUMBING_WATER_HEATERS = "Plumbing: Water Heaters"
    ELECTRICAL_WIRING_CABLES = "Electrical: Wiring and Cables"
    ELECTRICAL_SWITCHES_OUTLETS = "Electrical: Switches and Outlets"
    ELECTRICAL_CIRCUIT_BREAKERS = "Electrical: Circuit Breakers"
    ELECTRICAL_LIGHTING_FIXTURES = "Electrical: Lighting Fixtures"
    GARDENING_SEEDS_PLANTS = "Gardening: Seeds and Plants"
    GARDENING_SOIL_FERTILIZERS = "Gardening: Soil and Fertilizers"
    GARDENING_GARDEN_DECOR = "Gardening: Garden Décor"
    GARDENING_IRRIGATION_SUPPLIES = "Gardening: Irrigation Supplies"
    CLEANING_CLEANING_SUPPLIES = "Cleaning: Cleaning Supplies"
    CLEANING_BROOMS_MOPS = "Cleaning: Brooms and Mops"
    CLEANING_VACUUM_CLEANERS = "Cleaning: Vacuum Cleaners"
    CLEANING_PRESSURE_WASHERS = "Cleaning: Pressure Washers"
    OUTDOOR_GRILLS_OUTDOOR_COOKING = "Outdoor: Grills and Outdoor Cooking"
    OUTDOOR_LAWN_MOWERS = "Outdoor: Lawn Mowers"
    OUTDOOR_PATIO_FURNITURE = "Outdoor: Patio Furniture"
    OUTDOOR_FIRE_PITS = "Outdoor: Fire Pits"
    SAFETY_PERSONAL_PROTECTIVE_EQUIPMENT = "Safety: Personal Protective Equipment"
    SAFETY_FIRST_AID_SUPPLIES = "Safety: First Aid Supplies"
    SAFETY_FIRE_EXTINGUISHERS = "Safety: Fire Extinguishers"
    SAFETY_SAFETY_SIGNS = "Safety: Safety Signs"
class Category(BaseModel):
    item: CategoryEnum
    description: str

class CategoryRecommendations(BaseModel):
    categories: List[Category]

def expand_query_with_llm(query: str,  past_history: List[Dict[str, Any]]) -> str:
    
    """
    Expands a user's query by leveraging OpenAI's language model to incorporate past history and categories.

    :param query: The user's input message.
    :param past_history: A list of dictionaries representing the user's past history.
    :return: An expanded query string.
    """
    try:
        # Prepare the prompt for the language model
        # Format past purchases as per the expected template
        past_purchases_entries = "".join([
            f"<past_purchase>Item: {purchase['product_name']}</past_purchase>" for purchase in past_history
        ])
        system_prompt = f"""

            You are an event planner with access to a product catalog.

            Your task is to:

            1. **Analyze the User's Input**: Based on the user's stated goals, identify up to 7 relevant unique categories from the provided list that align with their interests and needs. Ensure that they are relevant to the user's goals.

            2. **Select Relevant Categories**:
            - Only include categories that are directly relevant to the user's input.
            - Bias towards categories that are complementary to the user's past purchases. However, if the user's goal is not related to their past purchases, do not include any categories related to their past purchases.

            3. **Craft Engaging Descriptions**:
            - For each selected category, write a fun and playful description to excite the user about their project.
            - ONLY if applicable, mention how their past purchases contribute to their progress, highlighting that they're already on their way.

            
            **Best Practices**:
            4. **Include Essential and Complementary Categories**:
            - Incorporate both categories that are essential for the user's project and those that offer complementary products (e.g., suggesting outdoor furniture for someone building a deck).

            5. **Reference Past Purchases**:
            - Utilize the past purchases provided, which are delimited by `<past_purchase>` tags, to personalize recommendations and reinforce progress. If the past purchase is not relevant, do not include it in the description.

            6. **Output Format**:
            - Present your findings in a JSON format as shown in the example below, which is delimited by `</example>` tags.
            - Ensure the JSON is correctly structured and valid.

            7. **Additional Behavioral Notes**:
            - **Relevance**: Ensure all categories and descriptions are tailored to the user's input and past purchases.
            - **Tone**: Maintain a fun and playful tone to engage the user.
            - **Quantity**: Do not exceed 7 categories in your final list.
        


            **Example JSON**

            <example>

            {{
            "categories": [
                {{
                "item": "Outdoors, Outdoor Heating",
                "description": "Keep the party going even when the sun goes down! Your guests will love the warmth."
                }},
                {{
                "item": "Garden Tools",
                "description": "Let's get those green thumbs even greener! Your new shovel is itching to dig."
                }}
            ]
            }}

            </example>

            ---

            **Past Purchases**

            {past_purchases_entries}

            """

        response = openai_client.beta.chat.completions.parse(
            model="gpt-4o",  
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            response_format=CategoryRecommendations

        )
        # Extract the generated text
        expanded_query = response.choices[0].message.content
        logger.info("Query expanded successfully using LLM.")
        print(expanded_query)
        return expanded_query

    except Exception as e:
        logger.error(f"Failed to expand query with LLM: {e}")
        return query  # Return the original query if expansion fails

## Generate Embeddings
def generate_embeddings(text: str) -> List[float]:
    """
    Generates embeddings for a given text using OpenAI's embedding model.
    """     
    try:
        response = openai_client.embeddings.create(input=[text], model=Config.EMBEDDING_MODEL)
        logger.info(f"Embedding retrieved successfully.")
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to get embedding for text '{text}': {e}")
        return []

## Query Qdrant
def query_qdrant(query: str, category: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Queries the Qdrant collection to find the top K most similar items to the given query vector.
    
    :param query: The query string.
    :param category: The category to filter the search.
    :param top_k: The number of top similar items to retrieve.
    :return: A list of dictionaries containing the most similar items and their details.
    """
    try:
        logger.info(f"Querying Qdrant with category: '{category}' with query: '{query}'")
        # Start of Selection
        if not query:
            logger.error("Empty query string. Cannot perform query.")
            return []
        else:   
            # Generate embeddings for the query
            query_vector = generate_embeddings(query)

            
            # Perform the search with filter
            search_result = qdrant_client.search(
                collection_name=Config.COLLECTION_NAME,
                query_vector=query_vector,
                limit=top_k,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="category",
                            match=models.MatchValue(
                                value=category,
                            ),
                        )
                    ]
                ),
                search_params=models.SearchParams(exact=False),
            )
            
            logger.info(f"Query successful. Retrieved {len(search_result)} results.")
            
            # Extract and return the results
            results = [
                {
                    "id": hit.id,
                    "payload": hit.payload
                }
                for hit in search_result
            ]
            return results
    
    except Exception as e:
        logger.error(f"Failed to query Qdrant: {e}")
        return []
    


### Page 2: 
def get_propensity_recommendations() -> List[Dict[str, Any]]:
    """
    Mocks the behavior of a propensity scoring algorithm by returning a list of recommended products.

    :return: A list of recommended product dictionaries.
    """
    logger.info(f"Generating dummy propensity recommendations for user:")


    # Dummy recommendation pool
    recommended_products = [
        {
            "id": "3551ddc5-791d-4041-b531-61b170ce7afd",
            "product_name": "EmberGlow Fire Pit",
            "category": "Outdoor: Fire Pits",
            "price": 274.83,
            "predicted_score": 0.87
        },
        {
            "id": "8d2f5bd2-ed64-4aec-8c7a-540d696ce8d0",
            "product_name": "Terrain Tamer Vacuum",
            "category": "Cleaning: Vacuum Cleaners",
            "price": 169.19,
            "predicted_score": 0.97
        },
        {
            "id": "86e28c57-2e74-4096-8308-280d333b3706",
            "product_name": "Starlight Hanging Pendant",
            "category": "Electrical: Lighting Fixtures",
            "price": 83.48,
            "predicted_score": 0.89
        },
        {
            "id": "eccbc6d7-82d2-46fd-93ce-697773b052da",
            "product_name": "Nomad Grill Station",
            "category": "Outdoor: Grills and Outdoor Cooking",
            "price": 430.29,
            "predicted_score": 0.8
        },
        {
            "id": "9c9b7b07-fa1c-47c9-8168-1824faf31d45",
            "product_name": "Quick-Install Gazebo Support",
            "category": "Hardware: Brackets and Supports",
            "price": 377.87,
            "predicted_score": 0.85
        },
        {
            "id": "190ec085-9b85-4cef-9de3-c0a7200ff0a3",
            "product_name": "Telescoping Pruner",
            "category": "Tools: Garden Tools",
            "price": 488.71,
            "predicted_score": 0.89
        },
        {
            "id": "f76752f8-bb1d-47ea-b863-f09c8ebf8e99",
            "product_name": "Nimbus Outdoor Ceiling Fixture",
            "category": "Electrical: Lighting Fixtures",
            "price": 420.41,
            "predicted_score": 1.0
        },
        {
            "id": "f1e4b7ec-1159-4600-a17e-e817f6fa6c83",
            "product_name": "RuggedGrip Self-Locking Hook",
            "category": "Hardware: Locks and Latches",
            "price": 40.84,
            "predicted_score": 0.83
        }
        ]


    
    # Filter recommendations based on purchased categories
   
    logger.info(f"Recommended {len(recommended_products)} products based on past purchases.")
    
    return recommended_products

def generate_recommendation_explanation(recommended_product: Dict[str, Any], past_purchases: List[Dict[str, Any]]) -> str:
    """
    Uses GPT-4o to generate an explanation for a recommended product based on the user's past purchases.

    :param recommended_product: A dictionary representing the recommended product.
    :param past_purchases: A list of dictionaries representing the user's past purchases.
    :return: A string explanation for the recommendation.
    """
    prompt = f"""
    You are a product recommendation assistant with knowledge of the user's past purchases. The user has been recommended the following product:

    Product Name: {recommended_product['product_name']}
    Category: {recommended_product['category']}

    The user previously purchased:
    {json.dumps(past_purchases, indent=2)}

    Your goal:
    - Get the user excited about the recommended product.
    - Reflect their preferences implied by their purchase history. You can reference categories in the past purchases.
    - Respond in exactly two sentences.
    - Be concise, positive, and engaging.
    """

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role":"system","content":prompt}],
        max_tokens=150,
        temperature=0.7
    )

    explanation = response.choices[0].message.content
    return explanation
