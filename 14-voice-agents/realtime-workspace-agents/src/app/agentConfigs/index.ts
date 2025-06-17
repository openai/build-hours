import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';
import { workspaceBuilderScenario } from './workspaceBuilder';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  workspaceBuilder: workspaceBuilderScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
  simpleHandoff: simpleHandoffScenario,  
};

export const defaultAgentSetKey = 'workspaceBuilder';
