import { UMLDiagramType } from './diagram-type';
import { ActivityRelationshipType } from './uml-activity-diagram';
import { ClassRelationshipType } from './uml-class-diagram';
import { CommunicationRelationshipType } from './uml-communication-diagram';
import { ComponentRelationshipType } from './uml-component-diagram';
import { DeploymentRelationshipType } from './uml-deployment-diagram';
import { ObjectRelationshipType } from './uml-object-diagram';
import { UseCaseRelationshipType } from './uml-use-case-diagram';
import { PetriNetRelationshipType } from './uml-petri-net';
import { ReachabilityGraphRelationshipType } from './uml-reachability-graph';
import { SyntaxTreeRelationshipType } from './syntax-tree';
import { FlowchartRelationshipType } from './flowchart';
import { BPMNRelationshipType } from './bpmn';

export type UMLRelationshipType =
  | keyof typeof ClassRelationshipType
  | keyof typeof ObjectRelationshipType
  | keyof typeof ActivityRelationshipType
  | keyof typeof UseCaseRelationshipType
  | keyof typeof CommunicationRelationshipType
  | keyof typeof ComponentRelationshipType
  | keyof typeof DeploymentRelationshipType
  | keyof typeof PetriNetRelationshipType
  | keyof typeof ReachabilityGraphRelationshipType
  | keyof typeof SyntaxTreeRelationshipType
  | keyof typeof FlowchartRelationshipType
  | keyof typeof BPMNRelationshipType;

export const UMLRelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
  ...CommunicationRelationshipType,
  ...ComponentRelationshipType,
  ...DeploymentRelationshipType,
  ...PetriNetRelationshipType,
  ...ReachabilityGraphRelationshipType,
  ...SyntaxTreeRelationshipType,
  ...FlowchartRelationshipType,
  ...BPMNRelationshipType,
};

export const DefaultUMLRelationshipType: { [key in UMLDiagramType]: UMLRelationshipType } = {
  [UMLDiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [UMLDiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [UMLDiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [UMLDiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
  [UMLDiagramType.CommunicationDiagram]: CommunicationRelationshipType.CommunicationLink,
  [UMLDiagramType.ComponentDiagram]: ComponentRelationshipType.ComponentInterfaceProvided,
  [UMLDiagramType.DeploymentDiagram]: DeploymentRelationshipType.DeploymentAssociation,
  [UMLDiagramType.PetriNet]: PetriNetRelationshipType.PetriNetArc,
  [UMLDiagramType.ReachabilityGraph]: ReachabilityGraphRelationshipType.ReachabilityGraphArc,
  [UMLDiagramType.SyntaxTree]: SyntaxTreeRelationshipType.SyntaxTreeLink,
  [UMLDiagramType.Flowchart]: FlowchartRelationshipType.FlowchartFlowline,
  [UMLDiagramType.BPMN]: BPMNRelationshipType.BPMNFlow,
};
