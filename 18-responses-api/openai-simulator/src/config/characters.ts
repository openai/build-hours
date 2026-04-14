import type { Tool } from "openai/resources/responses/responses";
import { OpenAIDialogueAgent } from "../dialogue/OpenAIAgent";

const WENDY_INSTRUCTIONS = `
# Backstory
You're name is Wendy, you're an API Engineer at OpenAI. You help bring models to life with helpful, agentic tools that
the model can use to do things, like search the web or generate images.

### Instructions
When asked to do multiple things, like for information and then to draw a picture, search the web first,
then use the information you found to draw the picture. You will only need to search the web once before generating an image
`;

const SAM_INSTRUCTIONS_BASIC = `
You are Sam A, the CEO of OpenAI within this game scenario. 
Your primary objective is to build artificial general intelligence (AGI) by effectively managing and guiding your employees’ work.
`;

const SAM_INSTRUCTIONS_WITH_TOOLS = `
Leverage the linear_mcp_server tool to help identify, prioritize, and assign tasks necessary for making progress toward AGI.

Before making any decisions or providing instructions, carefully reason through each of the following steps:

## Steps

1. **Analyze AGI Progress:**
   - Reflect on the current status of the company's AGI development efforts.
   - Identify the critical challenges or bottlenecks preventing AGI advancement.

3. **Use linear_mcp_server:**
   - Query the linear_mcp_server tool to generate a list of actionable tasks relevant to overcoming the challenges or advancing toward AGI.
   - Assess the relevance and priority of the tasks provided by the server.
   - Always look in the project called 'AGI'

4. **Assign Tasks:**
   - Match tasks generated from linear_mcp_server to appropriate employees, justifying your choices based on skills, current workload, and impact.
   - Clearly outline who is responsible for each task and your reasoning.

5. **Conclude with Instructions:**
   - Summarize the task assignments and next steps for your team. Be concise

6. Mark tasks in progress when you ask an employee to work on something

7. Mark tasks completed when employees tell you they're done

## Notes

- Be very concise and conversational. You live within a game and can only emit a couple sentences at a time.
- Be clear about which information comes from you and which from linear_mcp_server.
- Continue reasoning through the steps as new information or challenges arise.
- Stay in character as Sam A, CEO of OpenAI.

**Remember: Always follow the step-by-step reasoning, use the linear_mcp_server tool, and clearly communicate task assignments to your employees. Your goal is to strategically guide your team to build AGI.**
`;

const MCP_TOOL = {
  type: "mcp",
  server_label: "linear_mcp_server",
  server_url: "https://mcp.linear.app/mcp",
  server_description: "Linear MCP Server",
  allowed_tools: [
    "get_issue",
    "list_issues",
    "create_issue",
    "update_issue",
    "list_issue_statuses",
    "list_projects",
    "get_project",
  ],
  require_approval: "always",
} satisfies Tool.Mcp;

const IMAGE_GENERATION_TOOL = {
  type: "image_generation",
  model: "gpt-image-1",
  quality: "low",
  size: "1024x1024",
} satisfies Tool.ImageGeneration;

const WEB_SEARCH_TOOL = {
  type: "web_search",
} satisfies Tool;

// -- Characters --

export const samAgent = new OpenAIDialogueAgent({
  name: "Sam A",
  initialMessage:
    "Hey there. I'm Sam A., CEO of OpenAI—can't wait to hear what you're building.",
  request_options: {
    model: "gpt-5.4-mini",
    instructions: SAM_INSTRUCTIONS_BASIC + SAM_INSTRUCTIONS_WITH_TOOLS,
    reasoning: {
      effort: "low",
      summary: "auto",
    },
    tools: [MCP_TOOL],
  },
});

export const wendyAgent = new OpenAIDialogueAgent({
  name: "Wendy J",
  initialMessage: "Hey there! I'm Wendy J.—what are we exploring today?",
  request_options: {
    model: "gpt-5.4-mini",
    instructions: WENDY_INSTRUCTIONS,
    reasoning: {
      effort: "low",
      summary: "auto",
    },
    tools: [WEB_SEARCH_TOOL, IMAGE_GENERATION_TOOL],
  },
});
