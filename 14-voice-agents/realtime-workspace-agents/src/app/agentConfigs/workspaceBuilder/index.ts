import { workspaceManagerAgent } from './workspaceManager';
import { designerAgent } from './designer';
import { estimatorAgent } from './estimator';

// Wire up bidirectional hand-offs so that either agent can transfer control to
(workspaceManagerAgent.handoffs as any).push(designerAgent);
(designerAgent.handoffs as any).push(estimatorAgent);
(estimatorAgent.handoffs as any).push(designerAgent);

export const workspaceBuilderScenario = [
  workspaceManagerAgent,
  designerAgent,
  estimatorAgent,
];
