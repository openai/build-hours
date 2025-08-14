#!/usr/bin/env python3
import sys
from openai import OpenAI
import json
from tools import tools_list
client = OpenAI()

def ask(question: str):
    resp = client.responses.create(
        model="gpt-4.1-mini",
        tools=tools_list,
        input=question
    )
    print(json.dumps(resp.to_dict(), indent=4))
    print(f"\n\n-----------{resp.output_text}-----------")


def main():
    # If stdin isn’t a TTY, just do a one-off and exit
    if not sys.stdin.isatty():
        question = sys.stdin.read().strip()
        if question:
            ask(question)
        return

    # Interactive loop
    while True:
        try:
            question = input("User > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()  # newline on Ctrl+C/Ctrl+D
            break

        if not question or question.lower() in ("quit", "exit"):
            break

        ask(question)


if __name__ == "__main__":
    main()
