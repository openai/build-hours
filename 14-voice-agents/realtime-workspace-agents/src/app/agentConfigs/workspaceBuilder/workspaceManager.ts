import { RealtimeAgent, tool, RealtimeItem } from '@openai/agents/realtime';
import { fetchResponsesMessage } from '../chatSupervisor/supervisorAgent';
import {
  addWorkspaceTab,
  renameWorkspaceTab,
  deleteWorkspaceTab,
  setTabContent,
  getWorkspaceInfo,
  setSelectedTabId,
} from '@/app/contexts/WorkspaceContext';
import { workspaceManagerPrompt1, workspaceManagerPrompt2 } from './prompts';

// ---------------------------------------------------------------------------
// Workspace tools – these allow the agent to mutate the workspace state
// ---------------------------------------------------------------------------

// Info only tool for agents to use to get the current state of the workspace
export const workspaceInfoTool = tool({
  name: 'get_workspace_info',
  description: 'Get the current state of the workspace',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: getWorkspaceInfo,
});

export const workspaceTools = [
  tool({
    name: 'add_workspace_tab',
    description: 'Add a new tab to the workspace',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the tab',
        },
        type: {
          type: 'string',
          description: "The type of the tab (e.g., 'markdown', 'code', etc.)",
        },
        content: {
          type: 'string',
          description: 'The content of the tab to add',
        },
      },
      required: ['name', 'type'],
      additionalProperties: false,
    },
    execute: addWorkspaceTab,
  }),
  tool({
    name: 'set_selected_tab_id',
    description: 'Set the currently selected tab in the workspace',
    parameters: {
      type: 'object',
      properties: {
        index: {
          type: 'integer',
          description: '0-based position of the tab in the workspace',
        },
        name: {
          type: 'string',
          description: 'The name of the tab to select',
        },
      },
      required: ['index', 'name'],
      additionalProperties: false,
    },
    execute: setSelectedTabId,
  }),
  tool({
    name: 'rename_workspace_tab',
    description: 'Rename an existing workspace tab',
    parameters: {
      type: 'object',
      properties: {
        index: {
          type: 'integer',
          nullable: true,
          description: '0-based position of the tab in the workspace (optional - you can use id or current_name instead; set to null if unused)',
          minimum: 0,
        },
        current_name: {
          type: 'string',
          nullable: true,
          description: 'The current name of the tab (optional - you can use id or index instead; set to null if unused)',
        },
        new_name: {
          type: 'string',
          description: 'The new name for the tab',
        },
      },
      required: ['current_name', 'new_name'],
      additionalProperties: false,
    },
    execute: renameWorkspaceTab,
  }),
  tool({
    name: 'delete_workspace_tab',
    description: 'Delete a workspace tab',
    parameters: {
      type: 'object',
      properties: {
        index: {
          type: 'integer',
          nullable: true,
          description: '0-based position of the tab (optional – you can use id or name instead; set to null if unused)',
          minimum: 0,
        },
        name: {
          type: 'string',
          nullable: true,
          description: 'The name of the tab (optional – you can use id or index instead; set to null if unused)',
        },
      },
      required: [],
      additionalProperties: false,
    },
    execute: deleteWorkspaceTab,
  }),
  tool({
    name: 'set_tab_content',
    description: 'Set the content of a workspace tab (pipe-delimited CSV or markdown depending on tab type)',
    parameters: {
      type: 'object',
      properties: {
        index: {
          type: 'integer',
          nullable: true,
          description: '0-based position of the tab (optional – you can use id or name instead; set to null if unused)',
          minimum: 0,
        },
        name: {
          type: 'string',
          nullable: true,
          description: 'The name of the tab (optional – you can use id or index instead; set to null if unused)',
        },
        content: {
          type: 'string',
          description: 'The content for the tab (pipe-delimited CSV or markdown)',
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
    execute: setTabContent,
  }),
  workspaceInfoTool,
];

// ---------------------------------------------------------------------------
// Workspace Manager (worker) agent definition
// ---------------------------------------------------------------------------

export const workspaceManagerAgent = new RealtimeAgent({
  name: 'workspaceManager',
  voice: 'sage',
  instructions: workspaceManagerPrompt2,
  tools: workspaceTools,
  handoffs: [], // wired up in index.ts to avoid circular dependencies
});

async function getToolResponse(fName: string, args: any) {
  switch (fName) {
    case 'add_workspace_tab':
      return await addWorkspaceTab(args);
    case 'rename_workspace_tab':
      return await renameWorkspaceTab(args);
    case 'delete_workspace_tab':
      return await deleteWorkspaceTab(args);
    case 'set_tab_content':
      return await setTabContent(args);
    case 'get_workspace_info':
      return await getWorkspaceInfo();
    case 'set_selected_tab_id':
      return await setSelectedTabId(args);
    default:
      return undefined;
  }
}

async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = await getToolResponse(fName, args);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[workspaceManager] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[workspaceManager] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

// Server-side tool for making workspace changes 
// Used to give workspace change capabilities to other agents
// without having to hand off to the workspace manager
export const makeWorkspaceChanges = tool({
  name: 'makeWorkspaceChanges',
  description:
    'Make changes to the workspace tabs or content.',
  parameters: {
    type: 'object',
    properties: {
      tabsToChange: {
        type: 'string',
        description: 'A list of the tab(s) to make changes to',
      },
      workspaceChangesToMake: {
        type: 'string',
        description:
          'A description of the changes to make to the workspace tabs or content. ALWAYS tell the user that you are updating the workspace when you call this tool..',
      },
    },
    required: ['tabsToChange', 'workspaceChangesToMake'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { workspaceChangesToMake } = input as {
      workspaceChangesToMake: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: `You are a workspace builder assistant, use the tools below to make changes to the workspace based on the changes requested. 
          Before making changes like adding new tabs, check the current state to see if there is a tab that already exists for the same purpose. 
          Use the conversation history for context. 
          - first find the tab by name, then make the changes. 
          - if a matching tab is not found, create a new tab with the name provided.
          
          # IMPORTANT
          Pay attention to tabsToChange and only make workspaceChangesToMake changes to the tabs requested 
          Do not make any embellishments or additions past what is requested.`,
        },
        {
          type: 'message',
          role: 'user',
          content: `

          ==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}

          ==== Current Workspace State ====
          ${JSON.stringify(await getWorkspaceInfo(), null, 2)}

          ==== Requested Workspace Changes to Make ====
          ${workspaceChangesToMake}
          `,
        },
      ],
      tools: workspaceTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        type: 'function',
      })),
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    console.log('Response:', response);
    const responseText = await handleToolCalls(body, response, addBreadcrumb);
    if ((responseText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { workspaceManagerResponse: responseText as string };
  },
});