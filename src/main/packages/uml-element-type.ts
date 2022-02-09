import { ActivityElementType } from './uml-activity-diagram/index.js';
import { ClassElementType } from './uml-class-diagram/index.js';
import { ComponentElementType } from './uml-component-diagram/index.js';
import { DeploymentElementType } from './uml-deployment-diagram/index.js';
import { ObjectElementType } from './uml-object-diagram/index.js';
import { UseCaseElementType } from './uml-use-case-diagram/index.js';
import { PetriNetElementType } from './uml-petri-net/index.js';
import { CommunicationElementType } from './uml-communication-diagram/index.js';
import { UMLDiagramType } from './diagram-type.js';
import { SyntaxTreeElementType } from './syntax-tree/index.js';
import { FlowchartElementType } from './flowchart/index.js';
import { ColorLegendElementType } from './common/color-legend/index.js';
import { ReachabilityGraphElementType } from './uml-reachability-graph/index.js';

export type UMLElementType =
  | keyof typeof ClassElementType
  | keyof typeof ObjectElementType
  | keyof typeof ActivityElementType
  | keyof typeof UseCaseElementType
  | keyof typeof CommunicationElementType
  | keyof typeof ComponentElementType
  | keyof typeof DeploymentElementType
  | keyof typeof PetriNetElementType
  | keyof typeof ReachabilityGraphElementType
  | keyof typeof SyntaxTreeElementType
  | keyof typeof FlowchartElementType
  | keyof typeof ColorLegendElementType;

export const UMLElementType = {
  ...ClassElementType,
  ...ObjectElementType,
  ...ActivityElementType,
  ...UseCaseElementType,
  ...CommunicationElementType,
  ...ComponentElementType,
  ...DeploymentElementType,
  ...PetriNetElementType,
  ...ReachabilityGraphElementType,
  ...SyntaxTreeElementType,
  ...FlowchartElementType,
  ...ColorLegendElementType,
};

export const UMLElementsForDiagram: { [key in UMLDiagramType]: any } = {
  ...{
    [UMLDiagramType.ClassDiagram]: ClassElementType,
    [UMLDiagramType.ObjectDiagram]: ObjectElementType,
    [UMLDiagramType.ActivityDiagram]: ActivityElementType,
    [UMLDiagramType.UseCaseDiagram]: UseCaseElementType,
    [UMLDiagramType.CommunicationDiagram]: CommunicationElementType,
    [UMLDiagramType.ComponentDiagram]: ComponentElementType,
    [UMLDiagramType.DeploymentDiagram]: DeploymentElementType,
    [UMLDiagramType.PetriNet]: PetriNetElementType,
    [UMLDiagramType.ReachabilityGraph]: ReachabilityGraphElementType,
    [UMLDiagramType.SyntaxTree]: SyntaxTreeElementType,
    [UMLDiagramType.Flowchart]: FlowchartElementType,
  },
  ...ColorLegendElementType,
};
