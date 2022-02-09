import { ComponentType } from 'react';
import { DefaultPopup } from './common/default-popup.js';
import { DefaultRelationshipPopup } from './common/default-relationship-popup.js';
import { UMLClassifierUpdate } from './common/uml-classifier/uml-classifier-update.js';
import { UMLActivityControlFlowUpdate } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-update.js';
import { UMLActivityMergeNodeUpdate } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node-update.js';
import { UMLClassAssociationUpdate } from './uml-class-diagram/uml-class-association/uml-class-association-update.js';
import { UMLCommunicationLinkUpdate } from './uml-communication-diagram/uml-communication-link/uml-communication-link-update.js';
import { UMLComponentAssociationUpdate } from './uml-component-diagram/uml-component-association-update.js';
import { UMLDeploymentAssociationUpdate } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association-update.js';
import { UMLDeploymentNodeUpdate } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node-update.js';
import { UMLElementType } from './uml-element-type.js';
import { UMLObjectNameUpdate } from './uml-object-diagram/uml-object-name/uml-object-name-update.js';
import { UMLRelationshipType } from './uml-relationship-type.js';
import { UMLUseCaseAssociationUpdate } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association-update.js';
import { UMLPetriNetPlaceUpdate } from './uml-petri-net/uml-petri-net-place/uml-petri-net-place-update.js';
import { UMLPetriNetArcUpdate } from './uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-update.js';
import { UMLReachabilityGraphArcUpdate } from './uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc-update.js';
import { UMLReachabilityGraphMarkingUpdate } from './uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking-update.js';
import { SyntaxTreeTerminalUpdate } from './syntax-tree/syntax-tree-terminal/syntax-tree-terminal-update.js';
import { SyntaxTreeNonterminalUpdate } from './syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal-update.js';
import { FlowchartTerminalUpdate } from './flowchart/flowchart-terminal/flowchart-terminal-update.js';
import { FlowchartProcessUpdate } from './flowchart/flowchart-process/flowchart-process-update.js';
import { FlowchartDecisionUpdate } from './flowchart/flowchart-decision/flowchart-decision-update.js';
import { FlowchartFunctionCallUpdate } from './flowchart/flowchart-function-call/flowchart-function-call-update.js';
import { FlowchartInputOutputUpdate } from './flowchart/flowchart-input-output/flowchart-input-output-update.js';
import { FlowchartFlowlineUpdate } from './flowchart/flowchart-flowline/flowchart-flowline-update.js';
import { ColorLegendUpdate } from './common/color-legend/color-legend-update.js';

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
  [UMLElementType.ActivityInitialNode]: DefaultPopup,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNodeUpdate,
  [UMLElementType.ActivityObjectNode]: DefaultPopup,
  [UMLElementType.UseCase]: DefaultPopup,
  [UMLElementType.UseCaseActor]: DefaultPopup,
  [UMLElementType.UseCaseSystem]: DefaultPopup,
  [UMLElementType.Component]: DefaultPopup,
  [UMLElementType.ComponentInterface]: DefaultPopup,
  [UMLElementType.DeploymentNode]: UMLDeploymentNodeUpdate,
  [UMLElementType.DeploymentComponent]: DefaultPopup,
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
};
