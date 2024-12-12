# app.py
import streamlit as st


# Set the page configuration
st.set_page_config(
    page_title="Recommendations with LLMs",
    page_icon=":rocket:",  # You can use any emoji or a local image file
    layout="wide",         # "centered" or "wide"
    initial_sidebar_state="expanded"  # "auto", "expanded", "collapsed"
)

# Main content of the home page
st.title("Welcome to the Recommendation System App")
st.write("""
This application leverages GPT-4o to provide personalized recommendations based on your past purchases and queries.
Use the sidebar to navigate to different functionalities.
""")
