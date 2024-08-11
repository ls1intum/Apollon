import { ComponentType } from 'react';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { UMLClassifierUpdate } from './common/uml-classifier/uml-classifier-update';
import { UMLActivityControlFlowUpdate } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-update';
import { UMLActivityMergeNodeUpdate } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node-update';
import { UMLComponentSubsystemUpdate } from './uml-component-diagram/uml-component-subsystem/uml-component-subsystem-update';
import { UMLComponentUpdate } from './common/uml-component/uml-component-update';
import { UMLClassAssociationUpdate } from './uml-class-diagram/uml-class-association/uml-class-association-update';
import { UMLCommunicationLinkUpdate } from './uml-communication-diagram/uml-communication-link/uml-communication-link-update';
import { UMLComponentAssociationUpdate } from './uml-component-diagram/uml-component-association-update';
import { UMLDeploymentAssociationUpdate } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association-update';
import { UMLDeploymentNodeUpdate } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node-update';
import { UMLElementType } from './uml-element-type';
import { UMLObjectNameUpdate } from './uml-object-diagram/uml-object-name/uml-object-name-update';
import { UMLRelationshipType } from './uml-relationship-type';
import { UMLUseCaseAssociationUpdate } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association-update';
import { UMLPetriNetPlaceUpdate } from './uml-petri-net/uml-petri-net-place/uml-petri-net-place-update';
import { UMLPetriNetArcUpdate } from './uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-update';
import { UMLReachabilityGraphArcUpdate } from './uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc-update';
import { UMLReachabilityGraphMarkingUpdate } from './uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking-update';
import { SyntaxTreeTerminalUpdate } from './syntax-tree/syntax-tree-terminal/syntax-tree-terminal-update';
import { SyntaxTreeNonterminalUpdate } from './syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal-update';
import { FlowchartTerminalUpdate } from './flowchart/flowchart-terminal/flowchart-terminal-update';
import { FlowchartProcessUpdate } from './flowchart/flowchart-process/flowchart-process-update';
import { FlowchartDecisionUpdate } from './flowchart/flowchart-decision/flowchart-decision-update';
import { FlowchartFunctionCallUpdate } from './flowchart/flowchart-function-call/flowchart-function-call-update';
import { FlowchartInputOutputUpdate } from './flowchart/flowchart-input-output/flowchart-input-output-update';
import { FlowchartFlowlineUpdate } from './flowchart/flowchart-flowline/flowchart-flowline-update';
import { ColorLegendUpdate } from './common/color-legend/color-legend-update';
import { BPMNFlowUpdate } from './bpmn/bpmn-flow/bpmn-flow-update';
import { BPMNGatewayUpdate } from './bpmn/bpmn-gateway/bpmn-gateway-update';
import { BPMNPoolUpdate } from './bpmn/bpmn-pool/bpmn-pool-update';
import { BPMNIntermediateEventUpdate } from './bpmn/bpmn-intermediate-event/bpmn-intermediate-event-update';
import { BPMNStartEventUpdate } from './bpmn/bpmn-start-event/bpmn-start-event-update';
import { BPMNEndEventUpdate } from './bpmn/bpmn-end-event/bpmn-end-event-update';
import { BPMNTaskUpdate } from './bpmn/bpmn-task/bpmn-task-update';

export type Popups = { [key in UMLElementType | UMLRelationshipType]: ComponentType<{ element: any }> | null };
export const Popups: { [key in UMLElementType | UMLRelationshipType]: ComponentType<{ element: any }> | null } = {
  // Elements
  [UMLElementType.Package]: DefaultPopup,
  [UMLElementType.Class]: UMLClassifierUpdate,
  [UMLElementType.AbstractClass]: UMLClassifierUpdate,
  [UMLElementType.Interface]: UMLClassifierUpdate,
  [UMLElementType.Enumeration]: UMLClassifierUpdate,
  [UMLElementType.ClassAttribute]: null,
  [UMLElementType.ClassMethod]: null,
  [UMLElementType.ObjectName]: UMLObjectNameUpdate,
  [UMLElementType.ObjectAttribute]: null,
  [UMLElementType.ObjectMethod]: null,
  [UMLElementType.Activity]: DefaultPopup,
  [UMLElementType.ActivityActionNode]: DefaultPopup,
  [UMLElementType.ActivityFinalNode]: DefaultPopup,
  [UMLElementType.ActivityForkNode]: DefaultPopup,
  [UMLElementType.ActivityForkNodeHorizontal]: DefaultPopup,
  [UMLElementType.ActivityInitialNode]: DefaultPopup,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNodeUpdate,
  [UMLElementType.ActivityObjectNode]: DefaultPopup,
  [UMLElementType.UseCase]: DefaultPopup,
  [UMLElementType.UseCaseActor]: DefaultPopup,
  [UMLElementType.UseCaseSystem]: DefaultPopup,
  [UMLElementType.Component]: UMLComponentUpdate,
  [UMLElementType.Subsystem]: UMLComponentSubsystemUpdate,
  [UMLElementType.ComponentInterface]: DefaultPopup,
  [UMLElementType.DeploymentNode]: UMLDeploymentNodeUpdate,
  [UMLElementType.DeploymentComponent]: UMLComponentUpdate,
  [UMLElementType.DeploymentArtifact]: DefaultPopup,
  [UMLElementType.DeploymentInterface]: DefaultPopup,
  [UMLElementType.PetriNetPlace]: UMLPetriNetPlaceUpdate,
  [UMLElementType.PetriNetTransition]: DefaultPopup,
  [UMLElementType.ReachabilityGraphMarking]: UMLReachabilityGraphMarkingUpdate,
  [UMLElementType.CommunicationLinkMessage]: null,
  [UMLElementType.SyntaxTreeTerminal]: SyntaxTreeTerminalUpdate,
  [UMLElementType.SyntaxTreeNonterminal]: SyntaxTreeNonterminalUpdate,
  [UMLElementType.FlowchartTerminal]: FlowchartTerminalUpdate,
  [UMLElementType.FlowchartProcess]: FlowchartProcessUpdate,
  [UMLElementType.FlowchartDecision]: FlowchartDecisionUpdate,
  [UMLElementType.FlowchartFunctionCall]: FlowchartFunctionCallUpdate,
  [UMLElementType.FlowchartInputOutput]: FlowchartInputOutputUpdate,
  [UMLElementType.ColorLegend]: ColorLegendUpdate,
  [UMLElementType.BPMNTask]: BPMNTaskUpdate,
  [UMLElementType.BPMNSubprocess]: DefaultPopup,
  [UMLElementType.BPMNTransaction]: DefaultPopup,
  [UMLElementType.BPMNCallActivity]: DefaultPopup,
  [UMLElementType.BPMNAnnotation]: DefaultPopup,
  [UMLElementType.BPMNStartEvent]: BPMNStartEventUpdate,
  [UMLElementType.BPMNIntermediateEvent]: BPMNIntermediateEventUpdate,
  [UMLElementType.BPMNEndEvent]: BPMNEndEventUpdate,
  [UMLElementType.BPMNGateway]: BPMNGatewayUpdate,
  [UMLElementType.BPMNDataObject]: DefaultPopup,
  [UMLElementType.BPMNDataStore]: DefaultPopup,
  [UMLElementType.BPMNGroup]: DefaultPopup,
  [UMLElementType.BPMNPool]: BPMNPoolUpdate,
  [UMLElementType.BPMNSwimlane]: DefaultPopup,
  // Relationships
  [UMLRelationshipType.ClassAggregation]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassBidirectional]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassComposition]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassDependency]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassInheritance]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassRealization]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassUnidirectional]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ObjectLink]: DefaultRelationshipPopup,
  [UMLRelationshipType.ActivityControlFlow]: UMLActivityControlFlowUpdate,
  [UMLRelationshipType.UseCaseAssociation]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseExtend]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseGeneralization]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseInclude]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.CommunicationLink]: UMLCommunicationLinkUpdate,
  [UMLRelationshipType.ComponentInterfaceProvided]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.ComponentInterfaceRequired]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.ComponentDependency]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.DeploymentAssociation]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentDependency]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentInterfaceProvided]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentInterfaceRequired]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.PetriNetArc]: UMLPetriNetArcUpdate,
  [UMLRelationshipType.ReachabilityGraphArc]: UMLReachabilityGraphArcUpdate,
  [UMLRelationshipType.SyntaxTreeLink]: DefaultRelationshipPopup,
  [UMLRelationshipType.FlowchartFlowline]: FlowchartFlowlineUpdate,
  [UMLRelationshipType.BPMNFlow]: BPMNFlowUpdate,
};
