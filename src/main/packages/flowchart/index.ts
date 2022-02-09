import { FlowchartDecision } from './flowchart-decision/flowchart-decision.js';
import { FlowchartProcess } from './flowchart-process/flowchart-process.js';
import { FlowchartTerminal } from './flowchart-terminal/flowchart-terminal';
import { FlowchartInputOutput } from './flowchart-input-output/flowchart-input-output.js';
import { FlowchartFunctionCall } from './flowchart-function-call/flowchart-function-call.js';

export const FlowchartElementType = {
  FlowchartTerminal: 'FlowchartTerminal',
  FlowchartProcess: 'FlowchartProcess',
  FlowchartDecision: 'FlowchartDecision',
  FlowchartInputOutput: 'FlowchartInputOutput',
  FlowchartFunctionCall: 'FlowchartFunctionCall',
} as const;

export const FlowchartRelationshipType = {
  FlowchartFlowline: 'FlowchartFlowline',
} as const;

export type FlowchartElement =
  | FlowchartDecision
  | FlowchartProcess
  | FlowchartTerminal
  | FlowchartInputOutput
  | FlowchartFunctionCall;
