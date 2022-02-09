import { UMLActivityActionNode } from './uml-activity-diagram/uml-activity-action-node/uml-activity-action-node.js';
import { UMLActivityFinalNode } from './uml-activity-diagram/uml-activity-final-node/uml-activity-final-node.js';
import { UMLActivityForkNode } from './uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node.js';
import { UMLActivityInitialNode } from './uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node.js';
import { UMLActivityMergeNode } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node.js';
import { UMLActivityObjectNode } from './uml-activity-diagram/uml-activity-object-node/uml-activity-object-node.js';
import { UMLActivity } from './uml-activity-diagram/uml-activity/uml-activity.js';
import { UMLAbstractClass } from './uml-class-diagram/uml-abstract-class/uml-abstract-class.js';
import { UMLClassAttribute } from './uml-class-diagram/uml-class-attribute/uml-class-attribute.js';
import { UMLClassMethod } from './uml-class-diagram/uml-class-method/uml-class-method.js';
import { UMLClassPackage } from './uml-class-diagram/uml-class-package/uml-class-package.js';
import { UMLClass } from './uml-class-diagram/uml-class/uml-class.js';
import { UMLEnumeration } from './uml-class-diagram/uml-enumeration/uml-enumeration.js';
import { UMLInterface } from './uml-class-diagram/uml-interface/uml-interface.js';
import { UMLComponentInterface } from './uml-component-diagram/uml-component-interface/uml-component-interface.js';
import { UMLDeploymentArtifact } from './uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact.js';
import { UMLDeploymentNode } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node.js';
import { UMLElementType } from './uml-element-type.js';
import { UMLObjectAttribute } from './uml-object-diagram/uml-object-attribute/uml-object-attribute.js';
import { UMLObjectMethod } from './uml-object-diagram/uml-object-method/uml-object-method.js';
import { UMLObjectName } from './uml-object-diagram/uml-object-name/uml-object-name.js';
import { UMLUseCaseActor } from './uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor.js';
import { UMLUseCaseSystem } from './uml-use-case-diagram/uml-use-case-system/uml-use-case-system.js';
import { UMLUseCase } from './uml-use-case-diagram/uml-use-case/uml-use-case.js';
import { UMLDeploymentInterface } from './uml-deployment-diagram/uml-deployment-interface/uml-component-interface.js';
import { UMLPetriNetTransition } from './uml-petri-net/uml-petri-net-transition/uml-petri-net-transition.js';
import { UMLPetriNetPlace } from './uml-petri-net/uml-petri-net-place/uml-petri-net-place.js';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking.js';
import { CommunicationLinkMessage } from './uml-communication-diagram/uml-communication-link/uml-communiction-link-message.js';
import { UMLDeploymentComponent } from './uml-deployment-diagram/uml-deployment-component/uml-component.js';
import { UMLComponentComponent } from './uml-component-diagram/uml-component/uml-component-component.js';
import { SyntaxTreeTerminal } from './syntax-tree/syntax-tree-terminal/syntax-tree-terminal.js';
import { SyntaxTreeNonterminal } from './syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal.js';
import { FlowchartTerminal } from './flowchart/flowchart-terminal/flowchart-terminal.js';
import { FlowchartFunctionCall } from './flowchart/flowchart-function-call/flowchart-function-call.js';
import { FlowchartDecision } from './flowchart/flowchart-decision/flowchart-decision.js';
import { FlowchartProcess } from './flowchart/flowchart-process/flowchart-process.js';
import { FlowchartInputOutput } from './flowchart/flowchart-input-output/flowchart-input-output.js';
import { ColorLegend } from './common/color-legend/color-legend.js';

export const UMLElements = {
  [UMLElementType.Package]: UMLClassPackage,
  [UMLElementType.Class]: UMLClass,
  [UMLElementType.AbstractClass]: UMLAbstractClass,
  [UMLElementType.Interface]: UMLInterface,
  [UMLElementType.Enumeration]: UMLEnumeration,
  [UMLElementType.ClassAttribute]: UMLClassAttribute,
  [UMLElementType.ClassMethod]: UMLClassMethod,
  [UMLElementType.ObjectName]: UMLObjectName,
  [UMLElementType.ObjectAttribute]: UMLObjectAttribute,
  [UMLElementType.ObjectMethod]: UMLObjectMethod,
  [UMLElementType.Activity]: UMLActivity,
  [UMLElementType.ActivityInitialNode]: UMLActivityInitialNode,
  [UMLElementType.ActivityFinalNode]: UMLActivityFinalNode,
  [UMLElementType.ActivityActionNode]: UMLActivityActionNode,
  [UMLElementType.ActivityObjectNode]: UMLActivityObjectNode,
  [UMLElementType.ActivityForkNode]: UMLActivityForkNode,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNode,
  [UMLElementType.UseCase]: UMLUseCase,
  [UMLElementType.UseCaseActor]: UMLUseCaseActor,
  [UMLElementType.UseCaseSystem]: UMLUseCaseSystem,
  [UMLElementType.Component]: UMLComponentComponent,
  [UMLElementType.ComponentInterface]: UMLComponentInterface,
  [UMLElementType.DeploymentNode]: UMLDeploymentNode,
  [UMLElementType.DeploymentComponent]: UMLDeploymentComponent,
  [UMLElementType.DeploymentArtifact]: UMLDeploymentArtifact,
  [UMLElementType.DeploymentInterface]: UMLDeploymentInterface,
  [UMLElementType.PetriNetPlace]: UMLPetriNetPlace,
  [UMLElementType.PetriNetTransition]: UMLPetriNetTransition,
  [UMLElementType.ReachabilityGraphMarking]: UMLReachabilityGraphMarking,
  [UMLElementType.CommunicationLinkMessage]: CommunicationLinkMessage,
  [UMLElementType.SyntaxTreeTerminal]: SyntaxTreeTerminal,
  [UMLElementType.SyntaxTreeNonterminal]: SyntaxTreeNonterminal,
  [UMLElementType.FlowchartTerminal]: FlowchartTerminal,
  [UMLElementType.FlowchartFunctionCall]: FlowchartFunctionCall,
  [UMLElementType.FlowchartProcess]: FlowchartProcess,
  [UMLElementType.FlowchartDecision]: FlowchartDecision,
  [UMLElementType.FlowchartInputOutput]: FlowchartInputOutput,
  [UMLElementType.ColorLegend]: ColorLegend,
};
