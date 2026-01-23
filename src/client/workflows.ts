/**
 * Custom Workflow States
 *
 * Allows defining custom workflow states and transitions beyond the
 * default draft/published/archived/scheduled states.
 *
 * @example
 * const editorialWorkflow = defineWorkflow({
 *   states: [
 *     { name: "draft", displayName: "Draft", color: "gray" },
 *     { name: "in_review", displayName: "In Review", color: "yellow" },
 *     { name: "approved", displayName: "Approved", color: "blue" },
 *     { name: "published", displayName: "Published", color: "green", isPublished: true },
 *     { name: "archived", displayName: "Archived", color: "red" },
 *   ],
 *   transitions: {
 *     draft: ["in_review"],
 *     in_review: ["approved", "draft"],
 *     approved: ["published", "in_review"],
 *     published: ["archived", "draft"],
 *     archived: ["draft"],
 *   },
 * });
 */

export type WorkflowStateColor = "gray" | "yellow" | "blue" | "green" | "red" | "purple" | "orange";

export interface WorkflowState {
  name: string;
  displayName: string;
  color: WorkflowStateColor;
  icon?: string;
  isPublished?: boolean;
  description?: string;
}

export interface WorkflowConfig {
  states: WorkflowState[];
  transitions: Record<string, string[]>;
  initialState?: string;
}

export const DEFAULT_WORKFLOW: WorkflowConfig = {
  states: [
    { name: "draft", displayName: "Draft", color: "gray", icon: "FileEdit" },
    {
      name: "published",
      displayName: "Published",
      color: "green",
      icon: "Globe",
      isPublished: true,
    },
    { name: "archived", displayName: "Archived", color: "red", icon: "Archive" },
    { name: "scheduled", displayName: "Scheduled", color: "blue", icon: "Clock" },
  ],
  transitions: {
    draft: ["published", "scheduled", "archived"],
    published: ["draft", "archived"],
    archived: ["draft"],
    scheduled: ["draft", "published"],
  },
  initialState: "draft",
};

export function defineWorkflow(config: WorkflowConfig): WorkflowConfig {
  const stateNames = new Set(config.states.map((s) => s.name));

  for (const [from, tos] of Object.entries(config.transitions)) {
    if (!stateNames.has(from)) {
      throw new Error(`Workflow transition source "${from}" is not a valid state`);
    }
    for (const to of tos) {
      if (!stateNames.has(to)) {
        throw new Error(`Workflow transition target "${to}" is not a valid state`);
      }
    }
  }

  if (config.initialState && !stateNames.has(config.initialState)) {
    throw new Error(`Initial state "${config.initialState}" is not a valid state`);
  }

  return Object.freeze({
    ...config,
    initialState: config.initialState ?? config.states[0]?.name ?? "draft",
  });
}

export function getWorkflowState(
  workflow: WorkflowConfig,
  stateName: string
): WorkflowState | undefined {
  return workflow.states.find((s) => s.name === stateName);
}

export function getAvailableTransitions(
  workflow: WorkflowConfig,
  currentState: string
): WorkflowState[] {
  const targets = workflow.transitions[currentState] ?? [];
  return targets
    .map((name) => getWorkflowState(workflow, name))
    .filter((s): s is WorkflowState => s !== undefined);
}

export function canTransition(workflow: WorkflowConfig, from: string, to: string): boolean {
  return (workflow.transitions[from] ?? []).includes(to);
}

export function isPublishedState(workflow: WorkflowConfig, stateName: string): boolean {
  const state = getWorkflowState(workflow, stateName);
  return state?.isPublished === true;
}

export function getInitialState(workflow: WorkflowConfig): string {
  return workflow.initialState ?? workflow.states[0]?.name ?? "draft";
}

export function getAllPublishedStates(workflow: WorkflowConfig): WorkflowState[] {
  return workflow.states.filter((s) => s.isPublished);
}

export function validateWorkflowTransition(
  workflow: WorkflowConfig,
  from: string,
  to: string
): { valid: boolean; error?: string } {
  if (!getWorkflowState(workflow, from)) {
    return { valid: false, error: `Invalid source state: ${from}` };
  }
  if (!getWorkflowState(workflow, to)) {
    return { valid: false, error: `Invalid target state: ${to}` };
  }
  if (!canTransition(workflow, from, to)) {
    return {
      valid: false,
      error: `Transition from "${from}" to "${to}" is not allowed`,
    };
  }
  return { valid: true };
}
