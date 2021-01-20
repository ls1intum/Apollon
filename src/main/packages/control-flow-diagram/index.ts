import { ControlFlowDecision } from './control-flow-decision/control-flow-decision';
import { ControlFlowProcess } from './control-flow-process/control-flow-process';
import { ControlFlowTerminal } from './control-flow-terminal/control-flow-terminal';
import { ControlFlowInputOutput } from './control-flow-input-output/control-flow-input-output';
import { ControlFlowFunctionCall } from './control-flow-function-call/control-flow-function-call';

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

export type ControlFlowElement =
  | ControlFlowDecision
  | ControlFlowProcess
  | ControlFlowTerminal
  | ControlFlowInputOutput
  | ControlFlowFunctionCall;
