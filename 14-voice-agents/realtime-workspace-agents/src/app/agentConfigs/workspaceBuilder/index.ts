// Central entry point for the Workspace Builder agent set. This file mirrors
// the structure used by `customerServiceRetail`, keeping each agent in its own
// module and wiring their hand-offs here so that cross-file imports don’t create
// circular-dependency problems during module evaluation.

import { workspaceManagerAgent } from './workspaceManager';
import { designerAgent } from './designer';
import { estimatorAgent } from './estimator';

// Wire up bidirectional hand-offs so that either agent can transfer control to
// the other at run-time. We cast to `any` until the underlying library loosens
// its type invariance on the `handoffs` field.

(workspaceManagerAgent.handoffs as any).push(designerAgent);
(designerAgent.handoffs as any).push(estimatorAgent);
(estimatorAgent.handoffs as any).push(designerAgent);

// Export a convenient array that callers can import and register with the
// Realtime Agent runtime.

export const workspaceBuilderScenario = [
  workspaceManagerAgent,
  designerAgent,
  estimatorAgent,
];


// Name of the company represented by this agent set. Used by guardrails
export const workspaceBuilderCompanyName = 'Workspace Corp';
