# Background
The purpose of this repo is to show how LLMs can be used to enhance recomendation systems in two main ways:
1. Contextual Understanding: Supplementing a user's query with additional context and LLM techniques to improve the search experience
2. Explainability: Given the outputs of traditional recommendation algorithms and given user information, explaining recommendations to the end user

# Repo Structure

- **`app.py`**: Entry point for the Streamlit application.
- **`config.py`**: Contains configuration settings for the project.
- **`helper_functions.py`**: Utility functions used across the application.
- **`pages/`**: Directory containing Streamlit page scripts.
    - **`page_1_semantic_search.py`**: Handles semantic search and query expansion functionality.
    - **`page_2_explainable_recommendations.py`**: Manages explainable recommendations.
- **`upload-to-qdrant.py`**: Script to upload CSV data to Qdrant.
- **`upload-data/fake_hardware_data.csv`**: CSV file containing fake hardware store data with embedded descriptions.
- **`images.zip`**: The images corresponding to the hardware data.

# Prerequisites
- Python 3.10+
- OpenAI API Key
- Docker

# How to run
1. Set up config.py with your OpenAI API key and Qdrant host and port. It should work with the default settings.
2. Unzip the images.zip file to the images directory.
```
unzip images.zip
```
3. Spin up Qdrant. We use locally hosted Qdrant as our vector database for this example. 
```
pip install -r requirements.txt
docker-compose up -d
```
4. Upload data to Qdrant
```
python upload-to-qdrant.py
```
5. Run the Streamlit app (make sure OpenAI API Key is set as env variable)
```
export OPENAI_API_KEY=<your-openai-api-key>
streamlit run app.py
```
