import { UMLDiagramType } from './diagram-type.js';
import { ActivityRelationshipType } from './uml-activity-diagram/index.js';
import { ClassRelationshipType } from './uml-class-diagram/index.js';
import { CommunicationRelationshipType } from './uml-communication-diagram/index.js';
import { ComponentRelationshipType } from './uml-component-diagram/index.js';
import { DeploymentRelationshipType } from './uml-deployment-diagram/index.js';
import { ObjectRelationshipType } from './uml-object-diagram/index.js';
import { UseCaseRelationshipType } from './uml-use-case-diagram/index.js';
import { PetriNetRelationshipType } from './uml-petri-net/index.js';
import { ReachabilityGraphRelationshipType } from './uml-reachability-graph/index.js';
import { SyntaxTreeRelationshipType } from './syntax-tree/index.js';
import { FlowchartRelationshipType } from './flowchart/index.js';

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
  | keyof typeof FlowchartRelationshipType;

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
};
