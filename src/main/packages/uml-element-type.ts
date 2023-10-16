import { ActivityElementType } from './uml-activity-diagram';
import { ClassElementType } from './uml-class-diagram';
import { ComponentElementType } from './uml-component-diagram';
import { DeploymentElementType } from './uml-deployment-diagram';
import { ObjectElementType } from './uml-object-diagram';
import { UseCaseElementType } from './uml-use-case-diagram';
import { PetriNetElementType } from './uml-petri-net';
import { CommunicationElementType } from './uml-communication-diagram';
import { UMLDiagramType } from './diagram-type';
import { SyntaxTreeElementType } from './syntax-tree';
import { FlowchartElementType } from './flowchart';
import { ColorLegendElementType } from './common/color-legend';
import { ReachabilityGraphElementType } from './uml-reachability-graph';
import { BPMNElementType } from './bpmn';

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
  | keyof typeof ColorLegendElementType
  | keyof typeof BPMNElementType;

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
  ...BPMNElementType,
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
    [UMLDiagramType.BPMN]: BPMNElementType,
  },
  ...ColorLegendElementType,
};
