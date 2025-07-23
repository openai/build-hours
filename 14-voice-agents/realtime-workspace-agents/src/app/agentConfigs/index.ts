import { realEstateBrokerScenario } from './realEstateBroker';
import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects (single scenario after refactor)
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  realEstateBroker: realEstateBrokerScenario,
};

export const defaultAgentSetKey = 'realEstateBroker';
