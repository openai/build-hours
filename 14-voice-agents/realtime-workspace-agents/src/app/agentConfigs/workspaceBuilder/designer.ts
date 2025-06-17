import { RealtimeAgent } from '@openai/agents/realtime';
import { makeWorkspaceChanges, workspaceInfoTool } from './workspaceManager';
import { RealtimeItem, tool } from '@openai/agents/realtime';
import { fetchResponsesMessage } from '../chatSupervisor/supervisorAgent';
import { designerPrompt1, designerPrompt2 } from './prompts';

const searchTheWeb = tool({
  name: 'searchTheWeb',
  description:
    'Search the web for helpful information. When the tool finishes, make sure to update the workspace with relevant information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A search query to find web results',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { query } = input as { query: string };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    addBreadcrumb?.('[web search]', { query });

    const body = {
        model: "gpt-4.1",
        tools: [ { type: "web_search_preview" } ],
        tool_choice: "required",
        input: `You're a web search assistant. Search the web and respond with relevant information based on the Search Query given the conversation history.

          IMPORTANT: 
          - Your response should be in markdown format.
          - Whenever possible, your response should include links to inspiration images, and make sure you use markdown image syntax.

          ==== Recent Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Search Query ====
          ${query}`,
    };

    const response = await fetchResponsesMessage(body);
    const responseText = response.output_text;
    addBreadcrumb?.('[web search] response', { responseText });
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    return { webResponse: responseText as string };
  },
});

export const designerAgent = new RealtimeAgent({
  name: 'designer',
  voice: 'sage',
  instructions: designerPrompt2,
  tools: [searchTheWeb, workspaceInfoTool, makeWorkspaceChanges],
  handoffs: [], // wired up in index.ts to avoid circular dependencies
});


