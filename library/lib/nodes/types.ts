import type { NodeTypes } from "@xyflow/react"
import {
  DiagramNodeTypeRecord,
  type DiagramNodeType,
} from "../modelElementTypes"
import { Class, ColorDescription } from "./classDiagram"
import { ObjectName } from "./objectDiagram"
import { CommunicationObjectName } from "./communicationDiagram"
import { TitleAndDesctiption } from "./TitleAndDescriptionNode"
import Package from "./classDiagram/Package"
import {
  Activity,
  ActivityInitialNode,
  ActivityFinalNode,
  ActivityActionNode,
  ActivityObjectNode,
  ActivityMergeNode,
  ActivityForkNode,
  ActivityForkNodeHorizontal,
  ActivitySwimlane,
} from "./activityDiagram"
import { UseCase, UseCaseActor, UseCaseSystem } from "./useCaseDiagram"
import {
  Component,
  ComponentInterface,
  ComponentSubsystem,
} from "./componentDiagram"
import {
  DeploymentNode,
  DeploymentComponent,
  DeploymentArtifact,
  DeploymentInterface,
} from "./deploymentDiagram"
import {
  FlowchartTerminal,
  FlowchartProcess,
  FlowchartDecision,
  FlowchartInputOutput,
  FlowchartFunctionCall,
} from "./flowchart"
import { SyntaxTreeTerminal } from "./syntaxTreeDiagram/SyntaxTreeTerminal"
import { SyntaxTreeNonterminal } from "./syntaxTreeDiagram/SyntaxTreeNonterminal"
import { PetriNetTransition, PetriNetPlace } from "./petriNetDiagram"
import {
  BPMNTask,
  BPMNStartEvent,
  BPMNIntermediateEvent,
  BPMNEndEvent,
  BPMNGateway,
  BPMNSubprocess,
  BPMNTransaction,
  BPMNCallActivity,
  BPMNAnnotation,
  BPMNDataObject,
  BPMNDataStore,
  BPMNPool,
  BPMNGroup,
} from "./bpmn"
import { ReachabilityGraphMarking } from "./reachabilityGraphDiagram"
import {
  SfcStart,
  SfcStep,
  SfcActionTable,
  SfcTransitionBranch,
  SfcJump,
} from "./sfcDiagram"

export const diagramNodeTypes = {
  package: Package,
  class: Class,
  objectName: ObjectName,
  communicationObjectName: CommunicationObjectName,
  colorDescription: ColorDescription,
  titleAndDesctiption: TitleAndDesctiption,
  activity: Activity,
  activityInitialNode: ActivityInitialNode,
  activityFinalNode: ActivityFinalNode,
  activityActionNode: ActivityActionNode,
  activityObjectNode: ActivityObjectNode,
  activityMergeNode: ActivityMergeNode,
  activityForkNode: ActivityForkNode,
  activityForkNodeHorizontal: ActivityForkNodeHorizontal,
  activitySwimlane: ActivitySwimlane,
  useCase: UseCase,
  useCaseActor: UseCaseActor,
  useCaseSystem: UseCaseSystem,
  component: Component,
  componentInterface: ComponentInterface,
  componentSubsystem: ComponentSubsystem,
  deploymentNode: DeploymentNode,
  deploymentComponent: DeploymentComponent,
  deploymentArtifact: DeploymentArtifact,
  deploymentInterface: DeploymentInterface,
  flowchartTerminal: FlowchartTerminal,
  flowchartProcess: FlowchartProcess,
  flowchartDecision: FlowchartDecision,
  flowchartInputOutput: FlowchartInputOutput,
  flowchartFunctionCall: FlowchartFunctionCall,
  syntaxTreeTerminal: SyntaxTreeTerminal,
  syntaxTreeNonterminal: SyntaxTreeNonterminal,
  petriNetTransition: PetriNetTransition,
  petriNetPlace: PetriNetPlace,
  bpmnTask: BPMNTask,
  bpmnStartEvent: BPMNStartEvent,
  bpmnIntermediateEvent: BPMNIntermediateEvent,
  bpmnEndEvent: BPMNEndEvent,
  bpmnGateway: BPMNGateway,
  bpmnSubprocess: BPMNSubprocess,
  bpmnTransaction: BPMNTransaction,
  bpmnCallActivity: BPMNCallActivity,
  bpmnAnnotation: BPMNAnnotation,
  bpmnDataObject: BPMNDataObject,
  bpmnDataStore: BPMNDataStore,
  bpmnPool: BPMNPool,
  bpmnGroup: BPMNGroup,
  reachabilityGraphMarking: ReachabilityGraphMarking,
  sfcStart: SfcStart,
  sfcStep: SfcStep,
  sfcActionTable: SfcActionTable,
  sfcTransitionBranch: SfcTransitionBranch,
  sfcJump: SfcJump,
} satisfies Record<DiagramNodeType, NodeTypes[string]>

export { DiagramNodeTypeRecord, type DiagramNodeType }
