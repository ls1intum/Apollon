export const StateElementType = {
  State_: 'State_',
  StateVariable_: 'StateVariable_',
  StateAction_: 'StateAction_',
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
