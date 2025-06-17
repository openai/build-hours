import { RealtimeAgent } from '@openai/agents/realtime';
import { makeWorkspaceChanges, workspaceInfoTool } from './workspaceManager';
import { RealtimeItem, tool } from '@openai/agents/realtime';
import { fetchResponsesMessage } from '../chatSupervisor/supervisorAgent';
import { estimatorPrompt1 } from './prompts';

const calculate = tool({
  name: 'calculate',
  description:
    'Calculate construction costs or construction plan timeline.',
  parameters: {
    type: 'object',
    properties: {
      data_to_calculate: {
        type: 'string',
        description:
          'A detailed description of the construction costs or construction plan timeline to calculate.',
      },
    },
    required: ['data_to_calculate'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { data_to_calculate } = input as { data_to_calculate: string };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    addBreadcrumb?.('[calculate]', { data_to_calculate });

    const body = {
      model: "gpt-4.1",
      tools: [
        {
          type: "code_interpreter",
          container: { type: "auto" }
        }
      ],
      instructions: "You are a construction budget estimator calculator and timeline planning assistant. When asked a question, write and run code in code interpreter to answer the question.",
      input: `==== Relevant Conversation History ====
      ${JSON.stringify(filteredLogs, null, 2)}
      
      ==== Requeted Calculation ====
      ${data_to_calculate}`,
    };

    console.log('Body:', body);
    const response = await fetchResponsesMessage(body);
    console.log('Response:', response);
    const responseText = response.output_text;
    console.log('Response Text:', responseText);
    addBreadcrumb?.('[calculate] response', { responseText });
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    return { calculatorResponse: responseText as string };
  },
});

export const estimatorAgent = new RealtimeAgent({
  name: 'estimator',

  voice: 'sage',
  instructions: estimatorPrompt1,
  tools: [calculate,workspaceInfoTool, makeWorkspaceChanges],
  handoffs: [], // wired up in index.ts to avoid circular dependencies
});
