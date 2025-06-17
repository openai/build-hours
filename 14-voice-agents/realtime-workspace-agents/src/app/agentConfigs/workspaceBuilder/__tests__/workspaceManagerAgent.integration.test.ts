import dotenv from 'dotenv';
import { RealtimeSession } from '@openai/agents-realtime';
import { workspaceManagerAgent } from '../workspaceManager';

// Load test env vars
dotenv.config({ path: '.env.test' });

// Skip the suite if no API key is present
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  OPENAI_API_KEY not found in environment. Skipping realtime integration tests.');
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('workspaceManagerAgent realtime integration', () => {
    it('skipped due to missing OPENAI_API_KEY', () => {
      expect(true).toBe(true);
    });
  });
} else {
  // Mock the WorkspaceContext so executing tools does not require full React context
  jest.mock('@/app/contexts/WorkspaceContext', () => {
    return {
      addWorkspaceTab: jest.fn(async () => ({})),
      renameWorkspaceTab: jest.fn(),
      deleteWorkspaceTab: jest.fn(),
      setTabContent: jest.fn(),
      getWorkspaceInfo: jest.fn(async () => ({})),
      setSelectedTabId: jest.fn(),
    };
  });

  const userPrompt =
    'Please make me a workspace with 3 tabs - one named Overview, one named Task List, and one named Ideas';

  describe('workspaceManagerAgent realtime integration', () => {
    // Allow plenty of time for network round-trips
    jest.setTimeout(120_000);

    it('makes correct add_workspace_tab function calls via realtime SDK', async () => {
      const session = new RealtimeSession(workspaceManagerAgent, {
        transport: 'websocket',
        model: 'gpt-4o-realtime-preview-2024-06-03',
      } as any);

      await session.connect({ apiKey: OPENAI_API_KEY } as any);

      // Send user message like Transcript component does
      session.sendMessage(userPrompt, { source: 'test' } as any);

      // Helper to wait for condition or timeout
      const waitFor = (predicate: () => boolean, timeoutMs = 60_000) =>
        new Promise<void>((resolve, reject) => {
          const start = Date.now();
          const tick = () => {
            if (predicate()) return resolve();
            if (Date.now() - start > timeoutMs) {
              return reject(new Error('Timed out waiting for function calls'));
            }
            setTimeout(tick, 1000);
          };
          tick();
        });

      // Wait until 3 add_workspace_tab function calls have been made
      await waitFor(() => {
        const toolCalls = session.history.filter(
          (item: any) => item.type === 'function_call' && item.name === 'add_workspace_tab',
        );
        return toolCalls.length >= 3;
      });

      // Extract the arguments of the tool calls
      const toolCalls = session.history.filter(
        (item: any) => item.type === 'function_call' && item.name === 'add_workspace_tab',
      );

      const parsedArgs = toolCalls.map((c: any) => JSON.parse(c.arguments));

      // Expectations for names & types
      expect(parsedArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Overview', type: 'markdown' }),
          expect.objectContaining({ name: 'Task List', type: 'csv' }),
          expect.objectContaining({ name: 'Ideas', type: 'markdown' }),
        ]),
      );

      await session.close();
    });
  });
}
