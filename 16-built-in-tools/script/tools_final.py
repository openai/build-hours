import os
from dotenv import load_dotenv

load_dotenv()

tools_list = [
    {
      "type": "web_search_preview",
      "user_location": {
        "type": "approximate",
        "country": "US"
      },
      "search_context_size": "medium"
    },
    {
      "type": "code_interpreter",
      "container": {
        "type": "auto",
        "file_ids": [
          "file-CD3Up3S39kLZBPWPjB9uMg"
        ]
      }
    },
    {
      "type": "mcp",
      "server_label": "stripe",
      "server_url": "https://mcp.stripe.com",
      "headers": {
        "Authorization": f"Bearer {os.getenv('STRIPE_API_KEY')}"
      },
      "allowed_tools": [
        "retrieve_balance",
        "list_payment_intents"
      ],
      "require_approval": "never"
    }
  ]