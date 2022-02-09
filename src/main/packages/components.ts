import { FunctionComponent } from 'react';
import { ConnectedComponent } from 'react-redux';
import { UMLAssociationComponent } from './common/uml-association/uml-association-component.js';
import { UMLClassifierComponent } from './common/uml-classifier/uml-classifier-component.js';
import { UMLClassifierMemberComponent } from './common/uml-classifier/uml-classifier-member-component.js';
import { UMLActivityActionNodeComponent } from './uml-activity-diagram/uml-activity-action-node/uml-activity-action-node-component.js';
import { UMLActivityControlFlowComponent } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-component.js';
import { UMLActivityFinalNodeComponent } from './uml-activity-diagram/uml-activity-final-node/uml-activity-final-node-component.js';
import { UMLActivityForkNodeComponent } from './uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node-component.js';
import { UMLActivityInitialNodeComponent } from './uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node-component.js';
import { UMLActivityMergeNodeComponent } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node-component.js';
import { UMLActivityObjectNodeComponent } from './uml-activity-diagram/uml-activity-object-node/uml-activity-object-node-component.js';
import { UMLActivityComponent } from './uml-activity-diagram/uml-activity/uml-activity-component.js';
import { UMLClassPackageComponent } from './uml-class-diagram/uml-class-package/uml-class-package-component.js';
import { UMLCommunicationLinkComponent } from './uml-communication-diagram/uml-communication-link/uml-communication-link-component.js';
import { UMLDeploymentArtifactComponent } from './uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact-component.js';
import { UMLDeploymentAssociationComponent } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association-component.js';
import { UMLDeploymentNodeComponent } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node-component.js';
import { UMLElementType } from './uml-element-type.js';
import { UMLObjectLinkComponent } from './uml-object-diagram/uml-object-link/uml-object-link-component.js';
import { UMLRelationshipType } from './uml-relationship-type.js';
import { UMLUseCaseActorComponent } from './uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor-component.js';
import { UMLUseCaseAssociationComponent } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association-component.js';
import { UMLUseCaseExtendComponent } from './uml-use-case-diagram/uml-use-case-extend/uml-use-case-extend-component.js';
import { UMLUseCaseGeneralizationComponent } from './uml-use-case-diagram/uml-use-case-generalization/uml-use-case-generalization-component.js';
import { UMLUseCaseIncludeComponent } from './uml-use-case-diagram/uml-use-case-include/uml-use-case-include-component.js';
import { UMLUseCaseSystemComponent } from './uml-use-case-diagram/uml-use-case-system/uml-use-case-system-component.js';
import { UMLUseCaseComponent } from './uml-use-case-diagram/uml-use-case/uml-use-case-component.js';
import { UMLInterfaceComponent } from './common/uml-interface/uml-interface-component.js';
import { UMLInterfaceProvidedComponent } from './common/uml-interface-provided/uml-interface-provided-component.js';
import { UMLInterfaceRequiredComponent } from './common/uml-interface-required/uml-interface-required-component.js';
import { UMLDependencyComponent } from './common/uml-dependency/uml-dependency-component.js';
import { UMLPetriNetPlaceComponent } from './uml-petri-net/uml-petri-net-place/uml-petri-net-place-component.js';
import { UMLPetriNetTransitionComponent } from './uml-petri-net/uml-petri-net-transition/uml-petri-net-transition-component.js';
import { UMLPetriNetArcComponent } from './uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-component.js';
import { UMLReachabilityGraphArcComponent } from './uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc-component.js';
import { UMLReachabilityGraphMarkingComponent } from './uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking-component.js';
import { UMLComponentComponent } from './common/uml-component/uml-component-component.js';
import { SyntaxTreeTerminalComponent } from './syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component.js';
import { SyntaxTreeNonterminalComponent } from './syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal-component.js';
import { SyntaxTreeLinkComponent } from './syntax-tree/syntax-tree-link/syntax-tree-link-component.js';
import { FlowchartFlowlineComponent } from './flowchart/flowchart-flowline/flowchart-flowline-component.js';
import { FlowchartTerminalComponent } from './flowchart/flowchart-terminal/flowchart-terminal-component.js';
import { FlowchartProcessComponent } from './flowchart/flowchart-process/flowchart-process-component.js';
import { FlowchartDecisionComponent } from './flowchart/flowchart-decision/flowchart-decision-component.js';
import { FlowchartFunctionCallComponent } from './flowchart/flowchart-function-call/flowchart-function-call-component.js';
import { FlowchartInputOutputComponent } from './flowchart/flowchart-input-output/flowchart-input-output-component.js';
import { ColorLegendComponent } from './common/color-legend/color-legend-component.js';

export const Components: {
  [key in UMLElementType | UMLRelationshipType]:
    | FunctionComponent<{ element: any; scale: number }>
    | ConnectedComponent<FunctionComponent<any>, { element: any; scale: number }>;
} = {
  [UMLElementType.Package]: UMLClassPackageComponent,
  [UMLElementType.Class]: UMLClassifierComponent,
  [UMLElementType.AbstractClass]: UMLClassifierComponent,
  [UMLElementType.Interface]: UMLClassifierComponent,
  [UMLElementType.Enumeration]: UMLClassifierComponent,
  [UMLElementType.ClassAttribute]: UMLClassifierMemberComponent,
  [UMLElementType.ClassMethod]: UMLClassifierMemberComponent,
  [UMLElementType.ObjectName]: UMLClassifierComponent,
  [UMLElementType.ObjectAttribute]: UMLClassifierMemberComponent,
  [UMLElementType.ObjectMethod]: UMLClassifierMemberComponent,
  [UMLElementType.Activity]: UMLActivityComponent,
  [UMLElementType.ActivityActionNode]: UMLActivityActionNodeComponent,
  [UMLElementType.ActivityFinalNode]: UMLActivityFinalNodeComponent,
  [UMLElementType.ActivityForkNode]: UMLActivityForkNodeComponent,
  [UMLElementType.ActivityInitialNode]: UMLActivityInitialNodeComponent,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNodeComponent,
  [UMLElementType.ActivityObjectNode]: UMLActivityObjectNodeComponent,
  [UMLElementType.UseCase]: UMLUseCaseComponent,
  [UMLElementType.UseCaseActor]: UMLUseCaseActorComponent,
  [UMLElementType.UseCaseSystem]: UMLUseCaseSystemComponent,
  [UMLElementType.Component]: UMLComponentComponent,
  [UMLElementType.ComponentInterface]: UMLInterfaceComponent,
  [UMLElementType.DeploymentNode]: UMLDeploymentNodeComponent,
  [UMLElementType.DeploymentComponent]: UMLComponentComponent,
  [UMLElementType.DeploymentArtifact]: UMLDeploymentArtifactComponent,
  [UMLElementType.DeploymentInterface]: UMLInterfaceComponent,
  [UMLElementType.PetriNetTransition]: UMLPetriNetTransitionComponent,
  [UMLElementType.PetriNetPlace]: UMLPetriNetPlaceComponent,
  [UMLElementType.ReachabilityGraphMarking]: UMLReachabilityGraphMarkingComponent,
  [UMLElementType.CommunicationLinkMessage]: UMLClassifierMemberComponent,
  [UMLElementType.SyntaxTreeTerminal]: SyntaxTreeTerminalComponent,
  [UMLElementType.SyntaxTreeNonterminal]: SyntaxTreeNonterminalComponent,
  [UMLElementType.FlowchartTerminal]: FlowchartTerminalComponent,
  [UMLElementType.FlowchartDecision]: FlowchartDecisionComponent,
  [UMLElementType.FlowchartProcess]: FlowchartProcessComponent,
  [UMLElementType.FlowchartInputOutput]: FlowchartInputOutputComponent,
  [UMLElementType.FlowchartFunctionCall]: FlowchartFunctionCallComponent,
  [UMLElementType.ColorLegend]: ColorLegendComponent,
  [UMLRelationshipType.ClassAggregation]: UMLAssociationComponent,
  [UMLRelationshipType.ClassBidirectional]: UMLAssociationComponent,
  [UMLRelationshipType.ClassComposition]: UMLAssociationComponent,
  [UMLRelationshipType.ClassDependency]: UMLAssociationComponent,
  [UMLRelationshipType.ClassInheritance]: UMLAssociationComponent,
  [UMLRelationshipType.ClassRealization]: UMLAssociationComponent,
  [UMLRelationshipType.ClassUnidirectional]: UMLAssociationComponent,
  [UMLRelationshipType.ObjectLink]: UMLObjectLinkComponent,
  [UMLRelationshipType.ActivityControlFlow]: UMLActivityControlFlowComponent,
  [UMLRelationshipType.UseCaseAssociation]: UMLUseCaseAssociationComponent,
  [UMLRelationshipType.UseCaseExtend]: UMLUseCaseExtendComponent,
  [UMLRelationshipType.UseCaseGeneralization]: UMLUseCaseGeneralizationComponent,
  [UMLRelationshipType.UseCaseInclude]: UMLUseCaseIncludeComponent,
  [UMLRelationshipType.CommunicationLink]: UMLCommunicationLinkComponent,
  [UMLRelationshipType.ComponentInterfaceProvided]: UMLInterfaceProvidedComponent,
  [UMLRelationshipType.ComponentInterfaceRequired]: UMLInterfaceRequiredComponent,
  [UMLRelationshipType.ComponentDependency]: UMLDependencyComponent,
  [UMLRelationshipType.DeploymentAssociation]: UMLDeploymentAssociationComponent,
  [UMLRelationshipType.DeploymentDependency]: UMLDependencyComponent,
  [UMLRelationshipType.DeploymentInterfaceProvided]: UMLInterfaceProvidedComponent,
  [UMLRelationshipType.DeploymentInterfaceRequired]: UMLInterfaceRequiredComponent,
  [UMLRelationshipType.PetriNetArc]: UMLPetriNetArcComponent,
  [UMLRelationshipType.ReachabilityGraphArc]: UMLReachabilityGraphArcComponent,
  [UMLRelationshipType.SyntaxTreeLink]: SyntaxTreeLinkComponent,
  [UMLRelationshipType.FlowchartFlowline]: FlowchartFlowlineComponent,
};
