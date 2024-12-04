import { DeepPartial } from 'redux';
import { Styles } from './components/theme/styles';
import { UMLDiagramType } from './packages/diagram-type';
import { UMLElementType } from './packages/uml-element-type';
import { UMLRelationshipType } from './packages/uml-relationship-type';
import { ApollonMode, Locale } from './services/editor/editor-types';
import { Direction } from './services/uml-element/uml-element-port';
import { IBoundary } from './utils/geometry/boundary';
import { IPath } from './utils/geometry/path';
import { BPMNGatewayType } from './packages/bpmn/bpmn-gateway/bpmn-gateway';
import { BPMNEndEventType } from './packages/bpmn/bpmn-end-event/bpmn-end-event';
import { BPMNStartEventType } from './packages/bpmn/bpmn-start-event/bpmn-start-event';
import { BPMNIntermediateEventType } from './packages/bpmn/bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNTaskType } from './packages/bpmn/bpmn-task/bpmn-task';
import { BPMNFlowType } from './packages/bpmn/bpmn-flow/bpmn-flow';
import { BPMNMarkerType } from './packages/bpmn/common/types';

export { UMLDiagramType, UMLElementType, UMLRelationshipType, ApollonMode, Locale };
export type { Styles };

export type ApollonOptions = {
  type?: UMLDiagramType;
  mode?: ApollonMode;
  readonly?: boolean;
  enablePopups?: boolean;
  model?: UMLModel;
  theme?: DeepPartial<Styles>;
  locale?: Locale;
  copyPasteToClipboard?: boolean;
  colorEnabled?: boolean;
  scale?: number;
};

export type Selection = {
  elements: { [id: string]: boolean };
  relationships: { [id: string]: boolean };
};

export type UMLModel = {
  version: `3.${number}.${number}`;
  type: UMLDiagramType;
  size: { width: number; height: number };
  elements: { [id: string]: UMLElement };
  interactive: Selection;
  relationships: { [id: string]: UMLRelationship };
  assessments: { [id: string]: Assessment };
};

export type UMLModelElementType = UMLElementType | UMLRelationshipType | UMLDiagramType;

export type UMLModelElement = {
  id: string;
  name: string;
  type: UMLModelElementType;
  owner: string | null;
  bounds: IBoundary;
  highlight?: string;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  assessmentNote?: string;
};

export type UMLElement = UMLModelElement & {
  type: UMLElementType;
};

export type UMLRelationship = UMLModelElement & {
  type: UMLRelationshipType;
  path: IPath;
  source: {
    element: string;
    direction: Direction;
  };
  target: {
    element: string;
    direction: Direction;
  };
  isManuallyLayouted?: boolean;
};

export type UMLClassifier = UMLElement & {
  attributes: string[];
  methods: string[];
};

export interface UMLState extends UMLElement {
  type: UMLElementType;
  bodies: string[];
  fallbackBodies: string[];
}

export type UMLDeploymentNode = UMLElement & {
  stereotype: string;
  displayStereotype: boolean;
};

export type UMLDeploymentComponent = UMLElement & {
  displayStereotype: boolean;
};

export type UMLComponentSubsystem = UMLElement & {
  stereotype: string;
  displayStereotype: boolean;
};

export type UMLComponentComponent = UMLElement & {
  displayStereotype: boolean;
};

export type UMLPetriNetPlace = UMLElement & {
  amountOfTokens: number;
  capacity: number | string;
};

export type BPMNTask = UMLElement & {
  taskType: BPMNTaskType;
  marker: BPMNMarkerType;
};

export type BPMNGateway = UMLElement & {
  gatewayType: BPMNGatewayType;
};

export type BPMNStartEvent = UMLElement & {
  eventType: BPMNStartEventType;
};

export type BPMNIntermediateEvent = UMLElement & {
  eventType: BPMNIntermediateEventType;
};

export type BPMNEndEvent = UMLElement & {
  eventType: BPMNEndEventType;
};

export type BPMNFlow = UMLRelationship & {
  flowType: BPMNFlowType;
};

export type UMLReachabilityGraphMarking = UMLElement & {
  isInitialMarking: boolean;
};

export type UMLAssociation = UMLRelationship & {
  source: UMLRelationship['source'] & {
    multiplicity: string;
    role: string;
  };
  target: UMLRelationship['target'] & {
    multiplicity: string;
    role: string;
  };
};

export type UMLCommunicationLink = UMLRelationship & {
  messages: {
    [id: string]: {
      id: string;
      name: string;
      direction: 'source' | 'target';
    };
  };
};

export type FeedbackCorrectionStatus = {
  description?: string;
  status: 'CORRECT' | 'INCORRECT' | 'NOT_VALIDATED';
};

export type Assessment = {
  modelElementId: string;
  elementType: UMLElementType | UMLRelationshipType;
  score: number;
  feedback?: string;
  dropInfo?: any;
  label?: string;
  labelColor?: string;
  correctionStatus?: FeedbackCorrectionStatus;
};

export type ExportOptions = {
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  keepOriginalSize?: boolean;
  include?: string[];
  exclude?: string[];
};

export type SVG = {
  svg: string;
  clip: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type UMLStateTransition = UMLRelationship & {
  params?: string | string[];
};
