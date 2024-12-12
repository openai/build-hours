# pages/page_2_explainable_recommendations.py

import streamlit as st
from helper_functions import (
    generate_recommendation_explanation,
    get_past_purchases,
    get_propensity_recommendations
)
import logging
import os
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    st.title("Your Purchase History and Recommendations")

    # Initialize Session State for Explanations
    if 'explanations' not in st.session_state:
        st.session_state.explanations = {}

    # Display Previous Purchases
    st.subheader("Previous Purchases")
    past_purchases = get_past_purchases()
    with st.expander("Show Previous Purchases"):
        for purchase in past_purchases:
            st.write(f"{purchase['product_name']} - Purchased {purchase['quantity']} times")

    # Button to Generate Recommendations

    st.subheader("Recommended Products")
    recommendations = get_propensity_recommendations()
    for recommendation in recommendations:
        col1, col2 = st.columns([1, 3])
        with col1:
            image_id = recommendation.get('id')
            current_dir = os.path.dirname(__file__)

            # Construct the absolute path to the images folder
            images_dir = os.path.join(current_dir, '..', 'images')

            # Construct the full image path
            image_path = os.path.join(images_dir, f'{image_id}.jpg')
            st.image(image_path, width=150)
        with col2:
            st.write(f"**{recommendation['product_name']}** - Predicted Score: {recommendation['predicted_score']}")

            # Define a callback function for the button
            def generate_explanation(recom=recommendation):
                logger.info(f"Generating explanation for {recom['product_name']}")
                explanation = generate_recommendation_explanation(recom, past_purchases)
                st.session_state.explanations[recom['product_name']] = explanation
                # st.experimental_rerun()

            # Generate Explanation Button with callback
            st.button(
                f"Generate Explanation for {recommendation['product_name']}",
                key=f"gen_{recommendation['product_name']}",
                on_click=generate_explanation
            )

            # Display Explanation if it exists in session state
            if recommendation['product_name'] in st.session_state.explanations:
                st.write(f"**Explanation:** {st.session_state.explanations[recommendation['product_name']]}")

if __name__ == "__main__":
    main()