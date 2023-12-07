import { BPMNFlow } from './bpmn-flow/bpmn-flow';

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
  BPMNDataObject: 'BPMNDataObject',
  BPMNDataStore: 'BPMNDataStore',
  BPMNPool: 'BPMNPool',
  BPMNSwimlane: 'BPMNSwimlane',
  BPMNGroup: 'BPMNGroup',
} as const;

export const BPMNRelationshipType = {
  BPMNFlow: 'BPMNFlow',
} as const;
