import { useState } from "react"
import { MiniMap, MiniMapNodeProps, Panel, useReactFlow } from "@xyflow/react"
import {
  ClassSVG,
  PackageSVG,
  ActivitySVG,
  ActivityInitialNodeSVG,
  ActivityFinalNodeSVG,
  ActivityActionNodeSVG,
  ActivityObjectNodeSVG,
  ActivityMergeNodeSVG,
  ActivityForkNodeSVG,
  ActivityForkNodeHorizontalSVG,
  UseCaseNodeSVG,
  UseCaseSystemNodeSVG,
  UseCaseActorNodeSVG,
  ComponentInterfaceNodeSVG,
  ComponentSubsystemNodeSVG,
  ComponentNodeSVG,
  DeploymentNodeSVG,
  DeploymentComponentSVG,
  DeploymentArtifactSVG,
  DeploymentInterfaceSVG,
  SfcStartNodeSVG,
  SfcStepNodeSVG,
  SfcActionTableNodeSVG,
  SfcJumpNodeSVG,
  SfcTransitionBranchNodeSVG,
  FlowchartTerminalNodeSVG,
  FlowchartProcessNodeSVG,
  FlowchartDecisionNodeSVG,
  FlowchartInputOutputNodeSVG,
  FlowchartFunctionCallNodeSVG,
  SyntaxTreeTerminalNodeSVG,
  SyntaxTreeNonterminalNodeSVG,
  ObjectNameSVG,
  CommunicationObjectNameSVG,
  PetriNetPlaceSVG,
  PetriNetTransitionSVG,
  BPMNTaskNodeSVG,
  BPMNEventNodeSVG,
  BPMNGatewayNodeSVG,
  BPMNSubprocessNodeSVG,
  BPMNAnnotationNodeSVG,
  BPMNDataObjectNodeSVG,
  BPMNDataStoreNodeSVG,
  BPMNPoolNodeSVG,
  BPMNGroupNodeSVG,
  ReachabilityGraphMarkingSVG,
} from "./svgs"
import { DiagramNodeType } from "@/typings"
import { ZINDEX } from "@/constants"
import { MapIcon } from "./Icon/MapIcon"
import { SouthEastArrowIcon } from "./Icon/SouthEastArrowIcon"
import {
  BPMNEventProps,
  BPMNGatewayProps,
  BPMNSubprocessProps,
  BPMNTaskProps,
  ClassNodeProps,
  CommunicationObjectNodeProps,
  ComponentNodeProps,
  ComponentSubsystemNodeProps,
  DefaultNodeProps,
  DeploymentComponentProps,
  DeploymentNodeProps,
  ObjectNodeProps,
  PetriNetPlaceProps,
  ReachabilityGraphMarkingProps,
  SfcActionTableProps,
  SfcTransitionBranchNodeProps,
} from "@/types/nodes/NodeProps"

export const CustomMiniMap = () => {
  const [minimapCollapsed, setMinimapCollapsed] = useState(true)

  if (minimapCollapsed) {
    return (
      <Panel position="bottom-right" onClick={() => setMinimapCollapsed(false)}>
        <MapIcon fill="var(--apollon2-primary-contrast)" />
      </Panel>
    )
  }

  return (
    <Panel
      position="bottom-right"
      onClick={() => setMinimapCollapsed(true)}
      style={{ boxShadow: "none", backgroundColor: "transparent" }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          display: "flex",
          zIndex: ZINDEX.PANEL,
          padding: 8,
          backgroundColor: "var(--apollon2-background)",
          borderRadius: "4px",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0 0 4px 0 rgb(0 0 0 / 0.2)",
        }}
      >
        <SouthEastArrowIcon fill="var(--apollon2-primary-contrast)" />
      </div>

      <MiniMap
        zoomable
        onClick={() => setMinimapCollapsed(true)}
        nodeComponent={MiniMapNode}
        offsetScale={20}
        style={{ zIndex: ZINDEX.MINIMAP }}
      />
    </Panel>
  )
}

function MiniMapNode({ id, x, y }: MiniMapNodeProps) {
  const { getNode } = useReactFlow()

  const nodeInfo = getNode(id)
  if (!nodeInfo) return null

  switch (nodeInfo.type as DiagramNodeType) {
    case "class":
      return (
        <ClassSVG
          svgAttributes={{ x, y }}
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ClassNodeProps}
        />
      )
    case "package":
      return (
        <PackageSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "objectName":
      return (
        <ObjectNameSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ObjectNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "activity":
      return (
        <ActivitySVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityInitialNode":
      return (
        <ActivityInitialNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityFinalNode":
      return (
        <ActivityFinalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityActionNode":
      return (
        <ActivityActionNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityObjectNode":
      return (
        <ActivityObjectNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          data={nodeInfo.data as DefaultNodeProps}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
        />
      )
    case "activityMergeNode":
      return (
        <ActivityMergeNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "activityForkNode":
      return (
        <ActivityForkNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "activityForkNodeHorizontal":
      return (
        <ActivityForkNodeHorizontalSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "useCase":
      return (
        <UseCaseNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "useCaseActor":
      return (
        <UseCaseActorNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "useCaseSystem":
      return (
        <UseCaseSystemNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "component":
      return (
        <ComponentNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ComponentNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "componentSubsystem":
      return (
        <ComponentSubsystemNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as ComponentSubsystemNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "componentInterface":
      return (
        <ComponentInterfaceNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "deploymentNode":
      return (
        <DeploymentNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DeploymentNodeProps}
        />
      )
    case "deploymentComponent":
      return (
        <DeploymentComponentSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DeploymentComponentProps}
        />
      )
    case "deploymentArtifact":
      return (
        <DeploymentArtifactSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "deploymentInterface":
      return (
        <DeploymentInterfaceSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcStart":
      return (
        <SfcStartNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcStep":
      return (
        <SfcStepNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcActionTable":
      return (
        <SfcActionTableNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as SfcActionTableProps}
          svgAttributes={{ x, y }}
        />
      )
    case "sfcTransitionBranch":
      return (
        <SfcTransitionBranchNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as SfcTransitionBranchNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "sfcJump":
      return (
        <SfcJumpNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )

    case "flowchartTerminal":
      return (
        <FlowchartTerminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartProcess":
      return (
        <FlowchartProcessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartDecision":
      return (
        <FlowchartDecisionNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartInputOutput":
      return (
        <FlowchartInputOutputNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "flowchartFunctionCall":
      return (
        <FlowchartFunctionCallNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "syntaxTreeNonterminal":
      return (
        <SyntaxTreeNonterminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "syntaxTreeTerminal":
      return (
        <SyntaxTreeTerminalNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "communicationObjectName":
      return (
        <CommunicationObjectNameSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as CommunicationObjectNodeProps}
        />
      )
    case "petriNetPlace":
      return (
        <PetriNetPlaceSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as PetriNetPlaceProps}
        />
      )
    case "petriNetTransition":
      return (
        <PetriNetTransitionSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as DefaultNodeProps}
        />
      )
    case "bpmnTask":
      return (
        <BPMNTaskNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNTaskProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnStartEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          variant="start"
          data={nodeInfo.data as BPMNEventProps}
        />
      )
    case "bpmnIntermediateEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          variant="intermediate"
          data={nodeInfo.data as BPMNEventProps}
        />
      )
    case "bpmnEndEvent":
      return (
        <BPMNEventNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNEventProps}
          svgAttributes={{ x, y }}
          variant="end"
        />
      )
    case "bpmnGateway":
      return (
        <BPMNGatewayNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNGatewayProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnSubprocess":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnTransaction":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
          variant="transaction"
        />
      )
    case "bpmnCallActivity":
      return (
        <BPMNSubprocessNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as BPMNSubprocessProps}
          svgAttributes={{ x, y }}
          variant="call"
        />
      )
    case "bpmnAnnotation":
      return (
        <BPMNAnnotationNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnDataObject":
      return (
        <BPMNDataObjectNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnDataStore":
      return (
        <BPMNDataStoreNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnPool":
      return (
        <BPMNPoolNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "bpmnGroup":
      return (
        <BPMNGroupNodeSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          data={nodeInfo.data as DefaultNodeProps}
          svgAttributes={{ x, y }}
        />
      )
    case "reachabilityGraphMarking":
      return (
        <ReachabilityGraphMarkingSVG
          width={nodeInfo.width ?? 0}
          height={nodeInfo.height ?? 0}
          id={`minimap_${id}`}
          svgAttributes={{ x, y }}
          data={nodeInfo.data as ReachabilityGraphMarkingProps}
        />
      )

    default:
      return <rect x={x} y={y} width={100} height={100} fill="gray" />
  }
}
