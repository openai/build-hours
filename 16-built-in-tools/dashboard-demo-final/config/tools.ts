export const tools = [
  {
    type: "function",
    name: "generate_component",
    description:
      "Generate a UI component (card, chart, or table) and return its payload.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Which component variant to generate.",
          enum: ["card", "chart", "table"],
        },
        component: {
          description: "Payload whose schema depends on the chosen type.",
          anyOf: [
            {
              type: "object",
              description: "Card component",
              properties: {
                title: { type: "string" },
                value: { type: "string" },
                description: { type: "string" },
              },
              required: ["title", "value", "description"],
              additionalProperties: false,
            },
            {
              type: "object",
              description: "Chart component data",
              properties: {
                config: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    value1: {
                      type: "object",
                      properties: { label: { type: "string" } },
                      required: ["label"],
                      additionalProperties: false,
                    },
                    value2: {
                      type: "object",
                      properties: { label: { type: "string" } },
                      required: ["label"],
                      additionalProperties: false,
                    },
                  },
                  required: ["title", "value1", "value2"],
                  additionalProperties: false,
                },
                data: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", format: "date" },
                      value1: { type: "number" },
                      value2: { type: "number" },
                    },
                    required: ["date", "value1", "value2"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["config", "data"],
              additionalProperties: false,
            },
            {
              type: "object",
              description:
                "Table component (rows with arbitrary columns, each must include an id).",
              properties: {
                rows: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      name: { type: "string" },
                      description: { type: "string" },
                      comments: {
                        type: "string",
                        description:
                          "additional comments, empty string if not applicable",
                      },
                    },
                    required: ["id", "name", "description", "comments"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["rows"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["type", "component"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "web_search_preview",
    user_location: { type: "approximate", country: "FR", region: "Paris" },
    search_context_size: "medium",
  },
  {
    type: "code_interpreter",
    container: {
      type: "auto",
      file_ids: ["file-CD3Up3S39kLZBPWPjB9uMg"],
    },
  },
  {
    type: "mcp",
    server_label: "stripe",
    server_url: "https://mcp.stripe.com",
    allowed_tools: [
      "get_stripe_account_info",
      "list_customers",
      "retrieve_balance",
      "list_payment_intents",
    ],
    require_approval: "never",
  },
];
