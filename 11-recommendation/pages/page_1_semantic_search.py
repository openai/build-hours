import streamlit as st
from helper_functions import (
    expand_query_with_llm,
    get_past_purchases,
    query_qdrant
)
import json
import logging
import os
# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    st.title("Semantic Search with Categories")
    st.write("This page allows you to enter an ambiguous query and expand it into relevant categories, within which you can search for specific items.")
    st.write("---")
    st.write("**Note that in a real-world application, you would likely not have a two-click search process, this is just to demonstrate where Query Expansion happens (step 1) and semantic search happens (step 2).**")

    # Initialize session state
    if 'expanded_query' not in st.session_state:
        st.session_state.expanded_query = None

    if 'search_results' not in st.session_state:
        st.session_state.search_results = {}

    # Load distinct categories and past purchases
    
    all_past_history = get_past_purchases()

    # Display all past purchases in a table at the top
    with st.expander("All Past Purchases"):
        if all_past_history:
            st.dataframe(all_past_history)
        else:
            st.info("No past purchases available.")

    # User query input within a form
    with st.form(key='search_form'):
        user_query = st.text_input("Enter your query:", "")
        submit_button = st.form_submit_button(label='Search')

    if submit_button:
        if user_query.strip() == "":
            st.warning("Please enter a query.")
        else:
            with st.spinner("Expanding your query..."):
                # Pass all past purchases to the LLM
                expanded_query_json = expand_query_with_llm(user_query, all_past_history)
            
            try:
                st.session_state.expanded_query = json.loads(expanded_query_json)
                st.session_state.search_results = {category.get("item", "Unknown Category"): []
                                                   for category in st.session_state.expanded_query.get("categories", [])}
            except json.JSONDecodeError:
                st.error("Failed to parse the expanded query. Please try again.")
                logger.error("JSON decoding failed for expanded query.")

    if st.session_state.expanded_query:
        categories_data = st.session_state.expanded_query.get("categories", [])
        for category in categories_data:
            category_name = category.get("item", "Unknown Category")
            st.header(category_name)
            st.write(category.get("description", ""))

            # Search input within a form for each category
            with st.form(key=f'search_form_{category_name}'):
                search_query = st.text_input(
                    f"Search in {category_name}:",
                    key=f'search_input_{category_name}'
                )
                search_button = st.form_submit_button(label=f"Search {category_name}")

                if search_button:
                    if search_query.strip() == "":
                        st.warning("Please enter a search query.")
                    else:
                        with st.spinner(f"Searching in {category_name}..."):
                            results = query_qdrant(search_query, category_name)
                            st.session_state.search_results[category_name] = results

            # Display results if available
            results = st.session_state.search_results.get(category_name, [])
            if results:
                st.success(f"Found {len(results)} results:")
                cols = st.columns(3)  # Create a grid with 3 columns
                for idx, item in enumerate(results):
                    with cols[idx % 3]:  # Distribute items across the grid
                        image_id = item.get('payload', {}).get('product_id', '')
                        print(image_id)
                        current_dir = os.path.dirname(__file__)

                        # Construct the absolute path to the images folder
                        images_dir = os.path.join(current_dir, '..', 'images')

                        # Construct the full image path
                        image_path = os.path.join(images_dir, f'{image_id}.jpg')
                        if os.path.exists(image_path):
                            st.image(image_path, use_container_width=True)

                        st.write(f"**Title:** {item.get('payload', {}).get('product_name', 'No Title')}")
                        st.write(f"**Description:** {item.get('payload', {}).get('detailed_description', 'No Description')}")
                        st.markdown("---")
            elif search_button:
                st.info("No results found.")

if __name__ == "__main__":
    main()