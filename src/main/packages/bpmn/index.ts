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
  BPMNExclusiveGateway: 'BPMNExclusiveGateway',
  BPMNInclusiveGateway: 'BPMNInclusiveGateway',
  BPMNParallelGateway: 'BPMNParallelGateway',
  BPMNEventBasedGateway: 'BPMNEventBasedGateway',
  BPMNConversation: 'BPMNConversation',
} as const;

export const BPMNRelationshipType = {
  BPMNSequenceFlow: 'BPMNSequenceFlow',
} as const;
