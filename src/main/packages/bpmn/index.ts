import { BPMNSequenceFlow } from './bpmn-squence-flow/bpmn-sequence-flow';

export const BPMNElementType = {
  BPMNTask: 'BPMNTask',
  BPMNSubprocess: 'BPMNSubprocess',
  BPMNTransaction: 'BPMNTransaction',
  BPMNCallActivity: 'BPMNCallActivity',
  BPMNAnnotation: 'BPMNAnnotation',
  BPMNStartEvent: 'BPMNStartEvent',
  BPMNIntermediateEvent: 'BPMNIntermediateEvent',
  BPMNEndEvent: 'BPMNEndEvent',
  BPMNGateway: 'BPMNGateway',
  BPMNConversation: 'BPMNConversation',
} as const;

export const BPMNRelationshipType = {
  BPMNSequenceFlow: 'BPMNSequenceFlow',
} as const;
