#!/usr/bin/env python3
import sys
from openai import OpenAI
import json

client = OpenAI()

def ask(question: str):
    print("Hello, world!")


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
