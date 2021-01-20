export const ControlFlowElementType = {
  ControlFlowTerminal: 'ControlFlowTerminal',
  ControlFlowProcess: 'ControlFlowProcess',
  ControlFlowDecision: 'ControlFlowDecision',
  ControlFlowInputOutput: 'ControlFlowInputOutput',
  ControlFlowFunctionCall: 'ControlFlowFunctionCall',
} as const;

export const ControlFlowRelationshipType = {
  ControlFlowFlowLine: 'ControlFlowFlowLine',
} as const;
