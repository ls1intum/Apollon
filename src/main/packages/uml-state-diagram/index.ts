export const StateElementType = {
  State: 'State',
  StateVariable: 'StateVariable',
  StateAction: 'StateAction',
  StateActionNode: 'StateActionNode',
  StateFinalNode: 'StateFinalNode',
  StateForkNode: 'StateForkNode',
  StateForkNodeHorizontal: 'StateForkNodeHorizontal',
  StateInitialNode: 'StateInitialNode',
  StateMergeNode: 'StateMergeNode',
  StateObjectNode: 'StateObjectNode',
  StateCodeBlock: 'StateCodeBlock'
} as const;

export const StateRelationshipType = {
  StateTransition: 'StateTransition',
} as const;
