export const StateElementType = {
  State: 'State',
  StateActionNode: 'StateActionNode',
  StateFinalNode: 'StateFinalNode',
  StateForkNode: 'StateForkNode',
  StateForkNodeHorizontal: 'StateForkNodeHorizontal',
  StateInitialNode: 'StateInitialNode',
  StateMergeNode: 'StateMergeNode',
  StateObjectNode: 'StateObjectNode',
} as const;

export const StateRelationshipType = {
  StateControlFlow: 'StateControlFlow',
} as const;
