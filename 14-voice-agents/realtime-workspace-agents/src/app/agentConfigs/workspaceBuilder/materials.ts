import { RealtimeAgent } from '@openai/agents/realtime';
import { makeWorkspaceChanges, workspaceInfoTool } from './workspaceManager';
import { RealtimeItem, tool } from '@openai/agents/realtime';
import { fetchResponsesMessage } from '../chatSupervisor/supervisorAgent';
import { materialsPrompt1 } from './prompts';

// TODO: This could use an MCP connection to search a materials database
const searchMaterials = tool({
  name: 'searchMaterials',
  description:
    'Search the materials and supplies database for helpful information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'A search query to find materials and supplies',
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
        input: `You're a materials and supplies assistant. 
        Search the web and respond with relevant information based on the Search Query given the conversation history.
        
        ==== Recent Conversation History ====
        ${JSON.stringify(filteredLogs, null, 2)}
        
        ==== Search Query ====
        ${query}`,
    };

    const response = await fetchResponsesMessage(body);
    const responseText = response.output_text;
    addBreadcrumb?.('[materials search] response', { responseText });
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    return { webResponse: responseText as string };
  },
});

export const materialsAgent = new RealtimeAgent({
  name: 'materialsAndSupplies',
  voice: 'sage',
  instructions: materialsPrompt1,
  tools: [searchMaterials, workspaceInfoTool, makeWorkspaceChanges],
  handoffs: [], // wired up in index.ts to avoid circular dependencies
});

