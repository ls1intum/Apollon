import { UMLActivityActionNode } from './uml-activity-diagram/uml-activity-action-node/uml-activity-action-node';
import { UMLActivityFinalNode } from './uml-activity-diagram/uml-activity-final-node/uml-activity-final-node';
import { UMLActivityForkNode } from './uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node';
import { UMLActivityForkNodeHorizontal } from './uml-activity-diagram/uml-activity-fork-node-horizontal/uml-activity-fork-node-horizontal';
import { UMLActivityInitialNode } from './uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node';
import { UMLActivityMergeNode } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node';
import { UMLActivityObjectNode } from './uml-activity-diagram/uml-activity-object-node/uml-activity-object-node';
import { UMLActivity } from './uml-activity-diagram/uml-activity/uml-activity';
import { UMLAbstractClass } from './uml-class-diagram/uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './uml-class-diagram/uml-class-method/uml-class-method';
import { UMLClassPackage } from './uml-class-diagram/uml-class-package/uml-class-package';
import { UMLClass } from './uml-class-diagram/uml-class/uml-class';
import { UMLEnumeration } from './uml-class-diagram/uml-enumeration/uml-enumeration';
import { UMLInterface } from './uml-class-diagram/uml-interface/uml-interface';
import { UMLComponentInterface } from './uml-component-diagram/uml-component-interface/uml-component-interface';
import { UMLDeploymentArtifact } from './uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentNode } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node';
import { UMLElementType } from './uml-element-type';
import { UMLObjectAttribute } from './uml-object-diagram/uml-object-attribute/uml-object-attribute';
import { UMLObjectMethod } from './uml-object-diagram/uml-object-method/uml-object-method';
import { UMLObjectName } from './uml-object-diagram/uml-object-name/uml-object-name';
import { UMLUseCaseActor } from './uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseSystem } from './uml-use-case-diagram/uml-use-case-system/uml-use-case-system';
import { UMLUseCase } from './uml-use-case-diagram/uml-use-case/uml-use-case';
import { UMLDeploymentInterface } from './uml-deployment-diagram/uml-deployment-interface/uml-component-interface';
import { UMLPetriNetTransition } from './uml-petri-net/uml-petri-net-transition/uml-petri-net-transition';
import { UMLPetriNetPlace } from './uml-petri-net/uml-petri-net-place/uml-petri-net-place';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking';
import { CommunicationLinkMessage } from './uml-communication-diagram/uml-communication-link/uml-communiction-link-message';
import { UMLDeploymentComponent } from './uml-deployment-diagram/uml-deployment-component/uml-component';
import { UMLComponentComponent } from './uml-component-diagram/uml-component/uml-component-component';
import { UMLSubsystem } from './uml-component-diagram/uml-component-subsystem/uml-component-subsystem';
import { SyntaxTreeTerminal } from './syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeNonterminal } from './syntax-tree/syntax-tree-nonterminal/syntax-tree-nonterminal';
import { FlowchartTerminal } from './flowchart/flowchart-terminal/flowchart-terminal';
import { FlowchartFunctionCall } from './flowchart/flowchart-function-call/flowchart-function-call';
import { FlowchartDecision } from './flowchart/flowchart-decision/flowchart-decision';
import { FlowchartProcess } from './flowchart/flowchart-process/flowchart-process';
import { FlowchartInputOutput } from './flowchart/flowchart-input-output/flowchart-input-output';
import { ColorLegend } from './common/color-legend/color-legend';
import { BPMNTask } from './bpmn/bpmn-task/bpmn-task';
import { BPMNSubprocess } from './bpmn/bpmn-subprocess/bpmn-subprocess';
import { BPMNStartEvent } from './bpmn/bpmn-start-event/bpmn-start-event';
import { BPMNIntermediateEvent } from './bpmn/bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNEndEvent } from './bpmn/bpmn-end-event/bpmn-end-event';
import { BPMNGateway } from './bpmn/bpmn-gateway/bpmn-gateway';
import { BPMNTransaction } from './bpmn/bpmn-transaction/bpmn-transaction';
import { BPMNCallActivity } from './bpmn/bpmn-call-activity/bpmn-call-activity';
import { BPMNAnnotation } from './bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNDataObject } from './bpmn/bpmn-data-object/bpmn-data-object';
import { BPMNPool } from './bpmn/bpmn-pool/bpmn-pool';
import { BPMNSwimlane } from './bpmn/bpmn-swimlane/bpmn-swimlane';
import { BPMNGroup } from './bpmn/bpmn-group/bpmn-group';
import { BPMNDataStore } from './bpmn/bpmn-data-store/bpmn-data-store';

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
  [UMLElementType.ActivityForkNodeHorizontal]: UMLActivityForkNodeHorizontal,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNode,
  [UMLElementType.UseCase]: UMLUseCase,
  [UMLElementType.UseCaseActor]: UMLUseCaseActor,
  [UMLElementType.UseCaseSystem]: UMLUseCaseSystem,
  [UMLElementType.Component]: UMLComponentComponent,
  [UMLElementType.Subsystem]: UMLSubsystem,
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
  [UMLElementType.BPMNTask]: BPMNTask,
  [UMLElementType.BPMNSubprocess]: BPMNSubprocess,
  [UMLElementType.BPMNTransaction]: BPMNTransaction,
  [UMLElementType.BPMNCallActivity]: BPMNCallActivity,
  [UMLElementType.BPMNAnnotation]: BPMNAnnotation,
  [UMLElementType.BPMNStartEvent]: BPMNStartEvent,
  [UMLElementType.BPMNIntermediateEvent]: BPMNIntermediateEvent,
  [UMLElementType.BPMNEndEvent]: BPMNEndEvent,
  [UMLElementType.BPMNGateway]: BPMNGateway,
  [UMLElementType.BPMNDataObject]: BPMNDataObject,
  [UMLElementType.BPMNDataStore]: BPMNDataStore,
  [UMLElementType.BPMNPool]: BPMNPool,
  [UMLElementType.BPMNSwimlane]: BPMNSwimlane,
  [UMLElementType.BPMNGroup]: BPMNGroup,
};
