"""
streamlit app for exploring and editing JSONL files with chat data.
"""

import json
import os
import time

import streamlit as st


def load_jsonl(file):
    return [json.loads(line) for line in file]


def save_jsonl(file_path, data):
    with open(file_path, 'w') as file:
        for record in data:
            file.write(json.dumps(record) + '\n')


def display_message(message, role, index, message_index, data, file_path):
    """Display and edit a single message."""
    st.markdown(f"**{role.upper()}**")
    content = st.text_area("Message Content", message['content'],
                           key=f"message_{index}_{message_index}", label_visibility="hidden")
    if st.button("Save", key=f"save_{index}_{message_index}"):
        data[index]['messages'][message_index]['content'] = content
        save_jsonl(file_path, data)
        st.success("Content saved!")


def get_file_stats(file_path):
    """Get file statistics such as size, creation, and modification times."""
    stats = os.stat(file_path)
    return {
        "size": stats.st_size,
        "created": time.ctime(stats.st_ctime),
        "last_modified": time.ctime(stats.st_mtime)
    }


def main():
    st.set_page_config(layout="wide")
    st.title("🔍 Fine-tuning Data Explorer (Beta)")

    st.markdown(
        "**Demo Purposes Only** - This app allows you to explore and edit JSONL files with chat data. ")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    jsonl_files = [os.path.join(base_dir, file) for file in os.listdir(base_dir)
                   if file.endswith('.jsonl') and ('train' in file or 'val' in file) and
                   open(os.path.join(base_dir, file)).readline().strip().startswith('{"messages": ')]

    assert jsonl_files, "No JSONL files found in the directory."

    selected_file = st.selectbox(
        "Choose the JSONL file with chat data", jsonl_files)
    if selected_file:
        if 'last_selected_file' not in st.session_state or st.session_state.last_selected_file != selected_file:
            st.session_state.update(
                {"row_index": 0, "last_selected_file": selected_file})
            st.session_state.data = load_jsonl(open(selected_file, 'r'))
            st.session_state.total_records = len(st.session_state.data)
        data = st.session_state.data

        st.sidebar.header("Useful Stats")
        file_stats = get_file_stats(selected_file)
        st.sidebar.write(f"Total records: {st.session_state.total_records}")
        st.sidebar.write(f"File size: {file_stats['size']} bytes")

        total_messages = sum(len(record['messages']) for record in data)
        avg_messages_per_record = total_messages / st.session_state.total_records
        total_characters = sum(
            len(message['content']) for record in data for message in record['messages'])
        avg_characters_per_message = total_characters / total_messages
        st.sidebar.write(f"Total messages: {total_messages}")
        st.sidebar.write(
            f"Average messages per record: {avg_messages_per_record:.2f}")
        st.sidebar.write(f"Total characters: {total_characters}")
        st.sidebar.write(
            f"Average characters per message: {avg_characters_per_message:.2f}")

        if 'row_index' not in st.session_state:
            st.session_state.row_index = 0

        st.session_state.row_index = st.slider("Record Index", 1, st.session_state.total_records,
                                               st.session_state.row_index + 1, label_visibility="hidden") - 1

        col1, col2, col3 = st.columns([1, 1, 1])
        with col1:
            if st.button("⬅️ Previous", on_click=lambda: st.session_state.update(
                    row_index=(st.session_state.row_index - 1) % st.session_state.total_records)):
                pass
        with col2:
            st.write(
                f"Displaying record {st.session_state.row_index + 1} of {st.session_state.total_records}")
        with col3:
            if st.button("Next ➡️", on_click=lambda: st.session_state.update(
                    row_index=(st.session_state.row_index + 1) % st.session_state.total_records)):
                pass

        row_index = st.session_state.row_index
        row_data = data[row_index]

        for i, message in enumerate(row_data['messages']):
            display_message(
                message, message['role'], row_index, i, data, selected_file)
            if i < len(row_data['messages']) - 1:
                st.markdown("---")


if __name__ == "__main__":
    main()
