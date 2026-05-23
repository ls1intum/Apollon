import {
  useDiagramStore,
  usePopoverStore,
  useMetadataStore,
} from "@/store/context"
import { ApollonMode } from "@/typings"
import { useShallow } from "zustand/shallow"
import {
  ClassEditPopover,
  ClassGiveFeedbackPopover,
  ClassSeeFeedbackPopover,
  DefaultNodeEditPopover,
  DefaultNodeGiveFeedbackPopover,
  DefaultNodeSeeFeedbackPopover,
} from "./classDiagram"
import {
  ObjectEditPopover,
  ObjectGiveFeedbackPopover,
  ObjectSeeFeedbackPopover,
} from "./objectDiagram"
import { useViewportCenter } from "@/hooks"
import { getPopoverOrigin, getPositionOnCanvas, getQuadrant } from "@/utils"
import { PopoverProps } from "./types"
import { GenericPopover } from "./GenericPopover"
import {
  ActivityDiagramEdgeEditPopover,
  EdgeEditPopover,
  UseCaseEdgeEditPopover,
  EdgeGiveFeedbackPopover,
  EdgeSeeFeedbackPopover,
  CommunicationDiagramEdgeEditPopover,
} from "./edgePopovers"
import { LocationPopover } from "@/types"
import {
  ComponentEditPopover,
  ComponentSubsystemEditPopover,
} from "./componentDiagram"
import {
  CommunicationObjectNameEditPopover,
  CommunicationObjectNameGiveFeedbackPopover,
  CommunicationObjectNameSeeFeedbackPopover,
} from "./communicationDiagram"
import {
  DeploymentComponentEditPopover,
  DeploymentNodeEditPopover,
} from "./deploymentDiagram"
import {
  SyntaxTreeNonterminalEditPopover,
  SyntaxTreeTerminalEditPopover,
} from "./syntaxTreeDiagram"
import { PetriNetPlaceEditPopover } from "./petriNetDiagram"
import {
  BPMNTaskEditPopover,
  BPMNStartEventEditPopover,
  BPMNIntermediateEventEditPopover,
  BPMNEndEventEditPopover,
  BPMNGatewayEditPopover,
  BPMNPoolEditPopover,
} from "./bpmnDiagram"
import { ComponentEdgeEditPopover } from "./edgePopovers/ComponentDiagramEdgeEditPopover"
import { ReachabilityGraphMarkingEditPopover } from "./reachabilityGraphDiagram"
import { DeploymentEdgeEditPopover } from "./edgePopovers/DeploymentDiagramEdgeEditPopover"
import { ObjectDiagramEdgeEditPopover } from "./edgePopovers/ObjectDiagramEdgeEditPopover"
import { FlowChartEdgeEditPopover } from "./edgePopovers/FlowChartEdgeEditPopover"
import { SyntaxTreeEdgeEditPopover } from "./edgePopovers/SyntaxTreeEdgeEditPopover"
import { SfcActionTableEditPopover, SfcEdgeEditPopover } from "./sfcDiagram"
import { ReachabilityGraphEdgeEditPopover } from "./edgePopovers/ReachabilityGraphEdgeEditPopover"
import { BPMNDiagramEdgeEditPopover } from "./edgePopovers/BPMNDiagramEdgeEditPopover"
import { PetriNetEdgeEditPopover } from "./edgePopovers/PetriNetEdgeEditPopover"

type NodePopoverType =
  | "class"
  | "objectName"
  | "communicationObjectName"
  | "default"
  | "Component"
  | "ComponentSubsystem"
  | "FlowchartTerminal"
  | "FlowchartProcess"
  | "FlowchartDecision"
  | "FlowchartInputOutput"
  | "FlowchartFunctionCall"
  | "DeploymentComponent"
  | "DeploymentNode"
  | "SyntaxTreeNonterminal"
  | "SyntaxTreeTerminal"
  | "PetriNetPlace"
  | "BPMNTask"
  | "BPMNStartEvent"
  | "BPMNIntermediateEvent"
  | "BPMNEndEvent"
  | "BPMNGateway"
  | "BPMNSubprocess"
  | "BPMNTransaction"
  | "BPMNCallActivity"
  | "BPMNAnnotation"
  | "BPMNDataObject"
  | "BPMNDataStore"
  | "BPMNPool"
  | "BPMNGroup"
  | "ReachabilityGraphMarking"
  | "Sfc"
  | "SfcActionTable"

type EdgePopoverType =
  | "ClassAggregation"
  | "ClassInheritance"
  | "ClassRealization"
  | "ClassComposition"
  | "ClassBidirectional"
  | "ClassUnidirectional"
  | "ClassDependency"
  | "ActivityControlFlow"
  | "ObjectLink"
  | "CommunicationLink"
  | "UseCaseAssociation"
  | "UseCaseInclude"
  | "UseCaseExtend"
  | "UseCaseGeneralization"
  | "ComponentDependency"
  | "ComponentProvidedInterface"
  | "ComponentRequiredInterface"
  | "ComponentRequiredThreeQuarterInterface"
  | "ComponentRequiredQuarterInterface"
  | "BPMNSequenceFlow"
  | "BPMNMessageFlow"
  | "BPMNAssociationFlow"
  | "BPMNDataAssociationFlow"
  | "DeploymentAssociation"
  | "DeploymentDependency"
  | "DeploymentProvidedInterface"
  | "DeploymentRequiredInterface"
  | "DeploymentRequiredThreeQuarterInterface"
  | "DeploymentRequiredQuarterInterface"
  | "FlowChartFlowline"
  | "SyntaxTreeLink"
  | "SfcDiagramEdge"
  | "ReachabilityGraphArc"
  | "PetriNetArc"

type PopoverType = NodePopoverType | EdgePopoverType

const editPopovers: {
  class: React.FC<PopoverProps>
  objectName: React.FC<PopoverProps>
  communicationObjectName: React.FC<PopoverProps>
  default: React.FC<PopoverProps>
  ClassAggregation: React.FC<PopoverProps>
  ClassInheritance: React.FC<PopoverProps>
  ClassRealization: React.FC<PopoverProps>
  ClassComposition: React.FC<PopoverProps>
  ClassBidirectional: React.FC<PopoverProps>
  ClassUnidirectional: React.FC<PopoverProps>
  ClassDependency: React.FC<PopoverProps>
  ActivityControlFlow: React.FC<PopoverProps>
  ObjectLink: React.FC<PopoverProps>
  CommunicationLink: React.FC<PopoverProps>
  UseCaseAssociation: React.FC<PopoverProps>
  UseCaseInclude: React.FC<PopoverProps>
  UseCaseExtend: React.FC<PopoverProps>
  UseCaseGeneralization: React.FC<PopoverProps>
  PetriNetArc: React.FC<PopoverProps>
  BPMNSequenceFlow: React.FC<PopoverProps>
  BPMNMessageFlow: React.FC<PopoverProps>
  BPMNAssociationFlow: React.FC<PopoverProps>
  BPMNDataAssociationFlow: React.FC<PopoverProps>
  SfcDiagramEdge: React.FC<PopoverProps>
  ComponentDependency: React.FC<PopoverProps>
  ComponentProvidedInterface: React.FC<PopoverProps>
  ComponentRequiredInterface: React.FC<PopoverProps>
  ComponentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  ComponentRequiredQuarterInterface: React.FC<PopoverProps>
  DeploymentAssociation: React.FC<PopoverProps>
  DeploymentDependency: React.FC<PopoverProps>
  DeploymentProvidedInterface: React.FC<PopoverProps>
  DeploymentRequiredInterface: React.FC<PopoverProps>
  DeploymentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  DeploymentRequiredQuarterInterface: React.FC<PopoverProps>
  FlowChartFlowline: React.FC<PopoverProps>
  SyntaxTreeLink: React.FC<PopoverProps>
  ReachabilityGraphArc: React.FC<PopoverProps>
  Component: React.FC<PopoverProps>
  ComponentSubsystem: React.FC<PopoverProps>
  FlowchartTerminal: React.FC<PopoverProps>
  FlowchartProcess: React.FC<PopoverProps>
  FlowchartDecision: React.FC<PopoverProps>
  FlowchartInputOutput: React.FC<PopoverProps>
  FlowchartFunctionCall: React.FC<PopoverProps>
  DeploymentComponent: React.FC<PopoverProps>
  DeploymentNode: React.FC<PopoverProps>
  SyntaxTreeNonterminal: React.FC<PopoverProps>
  SyntaxTreeTerminal: React.FC<PopoverProps>
  PetriNetPlace: React.FC<PopoverProps>
  BPMNTask: React.FC<PopoverProps>
  BPMNStartEvent: React.FC<PopoverProps>
  BPMNIntermediateEvent: React.FC<PopoverProps>
  BPMNEndEvent: React.FC<PopoverProps>
  BPMNGateway: React.FC<PopoverProps>
  BPMNSubprocess: React.FC<PopoverProps>
  BPMNTransaction: React.FC<PopoverProps>
  BPMNCallActivity: React.FC<PopoverProps>
  BPMNAnnotation: React.FC<PopoverProps>
  BPMNDataObject: React.FC<PopoverProps>
  BPMNDataStore: React.FC<PopoverProps>
  BPMNPool: React.FC<PopoverProps>
  BPMNGroup: React.FC<PopoverProps>
  ReachabilityGraphMarking: React.FC<PopoverProps>
  Sfc: React.FC<PopoverProps>
  SfcActionTable: React.FC<PopoverProps>
} = {
  class: ClassEditPopover,
  objectName: ObjectEditPopover,
  communicationObjectName: CommunicationObjectNameEditPopover,
  default: DefaultNodeEditPopover,
  ClassAggregation: EdgeEditPopover,
  ClassInheritance: EdgeEditPopover,
  ClassRealization: EdgeEditPopover,
  ClassComposition: EdgeEditPopover,
  ClassBidirectional: EdgeEditPopover,
  ClassUnidirectional: EdgeEditPopover,
  ClassDependency: EdgeEditPopover,
  ActivityControlFlow: ActivityDiagramEdgeEditPopover,
  ObjectLink: ObjectDiagramEdgeEditPopover,
  CommunicationLink: CommunicationDiagramEdgeEditPopover,
  UseCaseAssociation: UseCaseEdgeEditPopover,
  UseCaseInclude: UseCaseEdgeEditPopover,
  UseCaseExtend: UseCaseEdgeEditPopover,
  UseCaseGeneralization: UseCaseEdgeEditPopover,
  BPMNSequenceFlow: BPMNDiagramEdgeEditPopover,
  BPMNMessageFlow: BPMNDiagramEdgeEditPopover,
  BPMNAssociationFlow: BPMNDiagramEdgeEditPopover,
  BPMNDataAssociationFlow: BPMNDiagramEdgeEditPopover,
  PetriNetArc: PetriNetEdgeEditPopover,
  SfcDiagramEdge: SfcEdgeEditPopover,
  ComponentDependency: ComponentEdgeEditPopover,
  ComponentProvidedInterface: ComponentEdgeEditPopover,
  ComponentRequiredInterface: ComponentEdgeEditPopover,
  ComponentRequiredThreeQuarterInterface: ComponentEdgeEditPopover,
  ComponentRequiredQuarterInterface: ComponentEdgeEditPopover,
  DeploymentAssociation: DeploymentEdgeEditPopover,
  DeploymentDependency: DeploymentEdgeEditPopover,
  DeploymentProvidedInterface: DeploymentEdgeEditPopover,
  DeploymentRequiredInterface: DeploymentEdgeEditPopover,
  DeploymentRequiredThreeQuarterInterface: DeploymentEdgeEditPopover,
  DeploymentRequiredQuarterInterface: DeploymentEdgeEditPopover,
  FlowChartFlowline: FlowChartEdgeEditPopover,
  SyntaxTreeLink: SyntaxTreeEdgeEditPopover,
  ReachabilityGraphArc: ReachabilityGraphEdgeEditPopover,
  Component: ComponentEditPopover,
  ComponentSubsystem: ComponentSubsystemEditPopover,
  FlowchartTerminal: DefaultNodeEditPopover,
  FlowchartProcess: DefaultNodeEditPopover,
  FlowchartDecision: DefaultNodeEditPopover,
  FlowchartInputOutput: DefaultNodeEditPopover,
  FlowchartFunctionCall: DefaultNodeEditPopover,
  DeploymentComponent: DeploymentComponentEditPopover,
  DeploymentNode: DeploymentNodeEditPopover,
  SyntaxTreeNonterminal: SyntaxTreeNonterminalEditPopover,
  SyntaxTreeTerminal: SyntaxTreeTerminalEditPopover,
  PetriNetPlace: PetriNetPlaceEditPopover,
  BPMNTask: BPMNTaskEditPopover,
  BPMNStartEvent: BPMNStartEventEditPopover,
  BPMNIntermediateEvent: BPMNIntermediateEventEditPopover,
  BPMNEndEvent: BPMNEndEventEditPopover,
  BPMNGateway: BPMNGatewayEditPopover,
  BPMNSubprocess: DefaultNodeEditPopover,
  BPMNTransaction: DefaultNodeEditPopover,
  BPMNCallActivity: DefaultNodeEditPopover,
  BPMNAnnotation: DefaultNodeEditPopover,
  BPMNDataObject: DefaultNodeEditPopover,
  BPMNDataStore: DefaultNodeEditPopover,
  BPMNPool: BPMNPoolEditPopover,
  BPMNGroup: DefaultNodeEditPopover,
  ReachabilityGraphMarking: ReachabilityGraphMarkingEditPopover,
  Sfc: DefaultNodeEditPopover,
  SfcActionTable: SfcActionTableEditPopover,
}

const giveFeedbackPopovers: {
  class: React.FC<PopoverProps>
  objectName: React.FC<PopoverProps>
  communicationObjectName: React.FC<PopoverProps>
  default: React.FC<PopoverProps>
  ClassAggregation: React.FC<PopoverProps>
  ClassInheritance: React.FC<PopoverProps>
  ClassRealization: React.FC<PopoverProps>
  ClassComposition: React.FC<PopoverProps>
  ClassBidirectional: React.FC<PopoverProps>
  ClassUnidirectional: React.FC<PopoverProps>
  ClassDependency: React.FC<PopoverProps>
  ActivityControlFlow: React.FC<PopoverProps>
  ObjectLink: React.FC<PopoverProps>
  CommunicationLink: React.FC<PopoverProps>
  UseCaseAssociation: React.FC<PopoverProps>
  UseCaseInclude: React.FC<PopoverProps>
  UseCaseExtend: React.FC<PopoverProps>
  UseCaseGeneralization: React.FC<PopoverProps>
  BPMNSequenceFlow: React.FC<PopoverProps>
  BPMNMessageFlow: React.FC<PopoverProps>
  BPMNAssociationFlow: React.FC<PopoverProps>
  BPMNDataAssociationFlow: React.FC<PopoverProps>
  ComponentDependency: React.FC<PopoverProps>
  ComponentProvidedInterface: React.FC<PopoverProps>
  ComponentRequiredInterface: React.FC<PopoverProps>
  ComponentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  ComponentRequiredQuarterInterface: React.FC<PopoverProps>
  DeploymentAssociation: React.FC<PopoverProps>
  DeploymentDependency: React.FC<PopoverProps>
  DeploymentProvidedInterface: React.FC<PopoverProps>
  DeploymentRequiredInterface: React.FC<PopoverProps>
  DeploymentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  DeploymentRequiredQuarterInterface: React.FC<PopoverProps>
  FlowChartFlowline: React.FC<PopoverProps>
  SyntaxTreeLink: React.FC<PopoverProps>
  ReachabilityGraphArc: React.FC<PopoverProps>
  PetriNetArc: React.FC<PopoverProps>
  Component: React.FC<PopoverProps>
  ComponentSubsystem: React.FC<PopoverProps>
  FlowchartTerminal: React.FC<PopoverProps>
  FlowchartProcess: React.FC<PopoverProps>
  FlowchartDecision: React.FC<PopoverProps>
  FlowchartInputOutput: React.FC<PopoverProps>
  FlowchartFunctionCall: React.FC<PopoverProps>
  DeploymentComponent: React.FC<PopoverProps>
  DeploymentNode: React.FC<PopoverProps>
  SyntaxTreeNonterminal: React.FC<PopoverProps>
  SyntaxTreeTerminal: React.FC<PopoverProps>
  PetriNetPlace: React.FC<PopoverProps>
  BPMNTask: React.FC<PopoverProps>
  BPMNStartEvent: React.FC<PopoverProps>
  BPMNIntermediateEvent: React.FC<PopoverProps>
  BPMNEndEvent: React.FC<PopoverProps>
  BPMNGateway: React.FC<PopoverProps>
  BPMNSubprocess: React.FC<PopoverProps>
  BPMNTransaction: React.FC<PopoverProps>
  BPMNCallActivity: React.FC<PopoverProps>
  BPMNAnnotation: React.FC<PopoverProps>
  BPMNDataObject: React.FC<PopoverProps>
  BPMNDataStore: React.FC<PopoverProps>
  BPMNPool: React.FC<PopoverProps>
  BPMNGroup: React.FC<PopoverProps>
  ReachabilityGraphMarking: React.FC<PopoverProps>
  Sfc: React.FC<PopoverProps>
  SfcActionTable: React.FC<PopoverProps>
  SfcDiagramEdge: React.FC<PopoverProps>
} = {
  class: ClassGiveFeedbackPopover,
  objectName: ObjectGiveFeedbackPopover,
  communicationObjectName: CommunicationObjectNameGiveFeedbackPopover,
  default: DefaultNodeGiveFeedbackPopover,
  ClassAggregation: EdgeGiveFeedbackPopover,
  ClassInheritance: EdgeGiveFeedbackPopover,
  ClassRealization: EdgeGiveFeedbackPopover,
  ClassComposition: EdgeGiveFeedbackPopover,
  ClassBidirectional: EdgeGiveFeedbackPopover,
  ClassUnidirectional: EdgeGiveFeedbackPopover,
  ClassDependency: EdgeGiveFeedbackPopover,
  ActivityControlFlow: EdgeGiveFeedbackPopover,
  ObjectLink: EdgeGiveFeedbackPopover,
  ReachabilityGraphArc: EdgeGiveFeedbackPopover,
  CommunicationLink: EdgeGiveFeedbackPopover,
  PetriNetArc: EdgeGiveFeedbackPopover,
  UseCaseAssociation: EdgeGiveFeedbackPopover,
  UseCaseInclude: EdgeGiveFeedbackPopover,
  UseCaseExtend: EdgeGiveFeedbackPopover,
  UseCaseGeneralization: EdgeGiveFeedbackPopover,
  BPMNSequenceFlow: EdgeGiveFeedbackPopover,
  BPMNMessageFlow: EdgeGiveFeedbackPopover,
  BPMNAssociationFlow: EdgeGiveFeedbackPopover,
  BPMNDataAssociationFlow: EdgeGiveFeedbackPopover,
  ComponentDependency: EdgeGiveFeedbackPopover,
  ComponentProvidedInterface: EdgeGiveFeedbackPopover,
  ComponentRequiredInterface: EdgeGiveFeedbackPopover,
  ComponentRequiredThreeQuarterInterface: EdgeGiveFeedbackPopover,
  ComponentRequiredQuarterInterface: EdgeGiveFeedbackPopover,
  DeploymentAssociation: EdgeGiveFeedbackPopover,
  DeploymentDependency: EdgeGiveFeedbackPopover,
  DeploymentProvidedInterface: EdgeGiveFeedbackPopover,
  DeploymentRequiredInterface: EdgeGiveFeedbackPopover,
  DeploymentRequiredThreeQuarterInterface: EdgeGiveFeedbackPopover,
  DeploymentRequiredQuarterInterface: EdgeGiveFeedbackPopover,
  FlowChartFlowline: EdgeGiveFeedbackPopover,
  SyntaxTreeLink: EdgeGiveFeedbackPopover,
  Component: DefaultNodeGiveFeedbackPopover,
  ComponentSubsystem: DefaultNodeGiveFeedbackPopover,
  FlowchartTerminal: DefaultNodeGiveFeedbackPopover,
  FlowchartProcess: DefaultNodeGiveFeedbackPopover,
  FlowchartDecision: DefaultNodeGiveFeedbackPopover,
  FlowchartInputOutput: DefaultNodeGiveFeedbackPopover,
  FlowchartFunctionCall: DefaultNodeGiveFeedbackPopover,
  DeploymentComponent: DefaultNodeGiveFeedbackPopover,
  DeploymentNode: DefaultNodeGiveFeedbackPopover,
  SyntaxTreeNonterminal: DefaultNodeGiveFeedbackPopover,
  SyntaxTreeTerminal: DefaultNodeGiveFeedbackPopover,
  PetriNetPlace: DefaultNodeGiveFeedbackPopover,
  BPMNTask: DefaultNodeGiveFeedbackPopover,
  BPMNStartEvent: DefaultNodeGiveFeedbackPopover,
  BPMNIntermediateEvent: DefaultNodeGiveFeedbackPopover,
  BPMNEndEvent: DefaultNodeGiveFeedbackPopover,
  BPMNGateway: DefaultNodeGiveFeedbackPopover,
  BPMNSubprocess: DefaultNodeGiveFeedbackPopover,
  BPMNTransaction: DefaultNodeGiveFeedbackPopover,
  BPMNCallActivity: DefaultNodeGiveFeedbackPopover,
  BPMNAnnotation: DefaultNodeGiveFeedbackPopover,
  BPMNDataObject: DefaultNodeGiveFeedbackPopover,
  BPMNDataStore: DefaultNodeGiveFeedbackPopover,
  BPMNPool: DefaultNodeGiveFeedbackPopover,
  BPMNGroup: DefaultNodeGiveFeedbackPopover,
  ReachabilityGraphMarking: DefaultNodeGiveFeedbackPopover,
  Sfc: DefaultNodeGiveFeedbackPopover,
  SfcActionTable: DefaultNodeGiveFeedbackPopover,
  SfcDiagramEdge: EdgeGiveFeedbackPopover,
}

const seeFeedbackPopovers: {
  class: React.FC<PopoverProps>
  objectName: React.FC<PopoverProps>
  communicationObjectName: React.FC<PopoverProps>
  default: React.FC<PopoverProps>
  ClassAggregation: React.FC<PopoverProps>
  ClassInheritance: React.FC<PopoverProps>
  ClassRealization: React.FC<PopoverProps>
  ClassComposition: React.FC<PopoverProps>
  ClassBidirectional: React.FC<PopoverProps>
  ClassUnidirectional: React.FC<PopoverProps>
  ClassDependency: React.FC<PopoverProps>
  ActivityControlFlow: React.FC<PopoverProps>
  ObjectLink: React.FC<PopoverProps>
  ReachabilityGraphArc: React.FC<PopoverProps>
  CommunicationLink: React.FC<PopoverProps>
  PetriNetArc: React.FC<PopoverProps>
  UseCaseAssociation: React.FC<PopoverProps>
  UseCaseInclude: React.FC<PopoverProps>
  UseCaseExtend: React.FC<PopoverProps>
  UseCaseGeneralization: React.FC<PopoverProps>
  BPMNSequenceFlow: React.FC<PopoverProps>
  BPMNMessageFlow: React.FC<PopoverProps>
  BPMNAssociationFlow: React.FC<PopoverProps>
  BPMNDataAssociationFlow: React.FC<PopoverProps>
  ComponentDependency: React.FC<PopoverProps>
  ComponentProvidedInterface: React.FC<PopoverProps>
  ComponentRequiredInterface: React.FC<PopoverProps>
  ComponentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  ComponentRequiredQuarterInterface: React.FC<PopoverProps>
  DeploymentAssociation: React.FC<PopoverProps>
  DeploymentDependency: React.FC<PopoverProps>
  DeploymentProvidedInterface: React.FC<PopoverProps>
  DeploymentRequiredInterface: React.FC<PopoverProps>
  DeploymentRequiredThreeQuarterInterface: React.FC<PopoverProps>
  DeploymentRequiredQuarterInterface: React.FC<PopoverProps>
  FlowChartFlowline: React.FC<PopoverProps>
  SyntaxTreeLink: React.FC<PopoverProps>
  Component: React.FC<PopoverProps>
  ComponentSubsystem: React.FC<PopoverProps>
  FlowchartTerminal: React.FC<PopoverProps>
  FlowchartProcess: React.FC<PopoverProps>
  FlowchartDecision: React.FC<PopoverProps>
  FlowchartInputOutput: React.FC<PopoverProps>
  FlowchartFunctionCall: React.FC<PopoverProps>
  DeploymentComponent: React.FC<PopoverProps>
  DeploymentNode: React.FC<PopoverProps>
  SyntaxTreeNonterminal: React.FC<PopoverProps>
  SyntaxTreeTerminal: React.FC<PopoverProps>
  PetriNetPlace: React.FC<PopoverProps>
  BPMNTask: React.FC<PopoverProps>
  BPMNStartEvent: React.FC<PopoverProps>
  BPMNIntermediateEvent: React.FC<PopoverProps>
  BPMNEndEvent: React.FC<PopoverProps>
  BPMNGateway: React.FC<PopoverProps>
  BPMNSubprocess: React.FC<PopoverProps>
  BPMNTransaction: React.FC<PopoverProps>
  BPMNCallActivity: React.FC<PopoverProps>
  BPMNAnnotation: React.FC<PopoverProps>
  BPMNDataObject: React.FC<PopoverProps>
  BPMNDataStore: React.FC<PopoverProps>
  BPMNPool: React.FC<PopoverProps>
  BPMNGroup: React.FC<PopoverProps>
  ReachabilityGraphMarking: React.FC<PopoverProps>
  Sfc: React.FC<PopoverProps>
  SfcActionTable: React.FC<PopoverProps>
  SfcDiagramEdge: React.FC<PopoverProps>
} = {
  class: ClassSeeFeedbackPopover,
  objectName: ObjectSeeFeedbackPopover,
  communicationObjectName: CommunicationObjectNameSeeFeedbackPopover,
  default: DefaultNodeSeeFeedbackPopover,
  ClassAggregation: EdgeSeeFeedbackPopover,
  ClassInheritance: EdgeSeeFeedbackPopover,
  ClassRealization: EdgeSeeFeedbackPopover,
  ClassComposition: EdgeSeeFeedbackPopover,
  ClassBidirectional: EdgeSeeFeedbackPopover,
  ClassUnidirectional: EdgeSeeFeedbackPopover,
  ClassDependency: EdgeSeeFeedbackPopover,
  ActivityControlFlow: EdgeSeeFeedbackPopover,
  ObjectLink: EdgeSeeFeedbackPopover,
  ReachabilityGraphArc: EdgeSeeFeedbackPopover,
  CommunicationLink: EdgeSeeFeedbackPopover,
  PetriNetArc: EdgeSeeFeedbackPopover,
  UseCaseAssociation: EdgeSeeFeedbackPopover,
  UseCaseInclude: EdgeSeeFeedbackPopover,
  UseCaseExtend: EdgeSeeFeedbackPopover,
  UseCaseGeneralization: EdgeSeeFeedbackPopover,
  BPMNSequenceFlow: EdgeSeeFeedbackPopover,
  BPMNMessageFlow: EdgeSeeFeedbackPopover,
  BPMNAssociationFlow: EdgeSeeFeedbackPopover,
  BPMNDataAssociationFlow: EdgeSeeFeedbackPopover,
  ComponentDependency: EdgeSeeFeedbackPopover,
  ComponentProvidedInterface: EdgeSeeFeedbackPopover,
  ComponentRequiredInterface: EdgeSeeFeedbackPopover,
  ComponentRequiredThreeQuarterInterface: EdgeSeeFeedbackPopover,
  ComponentRequiredQuarterInterface: EdgeSeeFeedbackPopover,
  DeploymentAssociation: EdgeSeeFeedbackPopover,
  DeploymentDependency: EdgeSeeFeedbackPopover,
  DeploymentProvidedInterface: EdgeSeeFeedbackPopover,
  DeploymentRequiredInterface: EdgeSeeFeedbackPopover,
  DeploymentRequiredThreeQuarterInterface: EdgeSeeFeedbackPopover,
  DeploymentRequiredQuarterInterface: EdgeSeeFeedbackPopover,
  FlowChartFlowline: EdgeSeeFeedbackPopover,
  SyntaxTreeLink: EdgeSeeFeedbackPopover,
  Component: DefaultNodeSeeFeedbackPopover,
  ComponentSubsystem: DefaultNodeSeeFeedbackPopover,
  FlowchartTerminal: DefaultNodeSeeFeedbackPopover,
  FlowchartProcess: DefaultNodeSeeFeedbackPopover,
  FlowchartDecision: DefaultNodeSeeFeedbackPopover,
  FlowchartInputOutput: DefaultNodeSeeFeedbackPopover,
  FlowchartFunctionCall: DefaultNodeSeeFeedbackPopover,
  DeploymentComponent: DefaultNodeSeeFeedbackPopover,
  DeploymentNode: DefaultNodeSeeFeedbackPopover,
  SyntaxTreeNonterminal: DefaultNodeSeeFeedbackPopover,
  SyntaxTreeTerminal: DefaultNodeSeeFeedbackPopover,
  PetriNetPlace: DefaultNodeSeeFeedbackPopover,
  BPMNTask: DefaultNodeSeeFeedbackPopover,
  BPMNStartEvent: DefaultNodeSeeFeedbackPopover,
  BPMNIntermediateEvent: DefaultNodeSeeFeedbackPopover,
  BPMNEndEvent: DefaultNodeSeeFeedbackPopover,
  BPMNGateway: DefaultNodeSeeFeedbackPopover,
  BPMNSubprocess: DefaultNodeSeeFeedbackPopover,
  BPMNTransaction: DefaultNodeSeeFeedbackPopover,
  BPMNCallActivity: DefaultNodeSeeFeedbackPopover,
  BPMNAnnotation: DefaultNodeSeeFeedbackPopover,
  BPMNDataObject: DefaultNodeSeeFeedbackPopover,
  BPMNDataStore: DefaultNodeSeeFeedbackPopover,
  BPMNPool: DefaultNodeSeeFeedbackPopover,
  BPMNGroup: DefaultNodeSeeFeedbackPopover,
  ReachabilityGraphMarking: DefaultNodeSeeFeedbackPopover,
  Sfc: DefaultNodeSeeFeedbackPopover,
  SfcActionTable: DefaultNodeSeeFeedbackPopover,
  SfcDiagramEdge: EdgeSeeFeedbackPopover,
}

interface PopoverManagerProps {
  elementId: string
  anchorEl: HTMLElement | SVGSVGElement | null
  type: PopoverType
}

export const PopoverManager = ({
  elementId,
  anchorEl,
  type,
}: PopoverManagerProps) => {
  const viewportCenter = useViewportCenter()
  const { nodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
    }))
  )

  const { diagramMode, readonly } = useMetadataStore(
    useShallow((state) => ({
      diagramMode: state.mode,
      readonly: state.readonly,
    }))
  )
  const { popoverElementId, popupEnabled, setPopOverElementId } =
    usePopoverStore(
      useShallow((state) => ({
        popoverElementId: state.popoverElementId,
        popupEnabled: state.popupEnabled,
        setPopOverElementId: state.setPopOverElementId,
      }))
    )

  if (!anchorEl || !popupEnabled) {
    return null
  }

  const open = popoverElementId === elementId

  if (!open) {
    return null
  }
  const onClose = () => {
    setPopOverElementId(null)
  }

  let popoverOrigin: LocationPopover = {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    transformOrigin: { vertical: "top", horizontal: "left" },
  }

  const node = nodes.find((node) => node.id === elementId)
  if (node && anchorEl && open) {
    const nodePositionOnCanvas = getPositionOnCanvas(node, nodes)
    const quadrant = getQuadrant(nodePositionOnCanvas, viewportCenter)
    popoverOrigin = getPopoverOrigin(quadrant)
  }

  let Component: React.ComponentType<PopoverProps> | null = null

  const isEditing = diagramMode === ApollonMode.Modelling && !readonly
  const isGivingFeedback = diagramMode === ApollonMode.Assessment && !readonly
  const isSeeingFeedback = diagramMode === ApollonMode.Assessment && readonly

  if (isEditing) {
    Component = editPopovers[type] ?? null
  } else if (isGivingFeedback) {
    Component = giveFeedbackPopovers[type] ?? null
  } else if (isSeeingFeedback) {
    Component = seeFeedbackPopovers[type] ?? null
  }

  return Component ? (
    <GenericPopover
      id={`popover-${elementId}`}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={popoverOrigin.anchorOrigin}
      transformOrigin={popoverOrigin.transformOrigin}
      maxHeight={500}
      maxWidth={isEditing ? 278 : 400}
    >
      <Component elementId={elementId} />
    </GenericPopover>
  ) : null
}
