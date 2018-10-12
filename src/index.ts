import ApollonEditor from "./gui";
import { getAllEntities, getAllRelationships, ReduxState } from "./gui/redux";
import * as DiagramLayouter from "./rendering/layouters/diagram";

export { computeBoundingBox } from "./core/geometry/boundingBox";

export * from "./gui";
export default ApollonEditor;

export function layoutDiagram(state: ReduxState, layoutOptions: DiagramLayouter.LayoutOptions) {
    const entities = getAllEntities(state);
    const relationships = getAllRelationships(state);

    return DiagramLayouter.layoutDiagram({ entities, relationships }, layoutOptions);
}

export {
    renderDiagramToSVG,
    renderEntityToSVG,
    renderRelationshipToSVG
} from "./rendering/renderers/svg";

export {
    ENTITY_KIND_HEIGHT,
    ENTITY_MEMBER_HEIGHT,
    ENTITY_MEMBER_LIST_VERTICAL_PADDING,
    ENTITY_NAME_HEIGHT
} from "./rendering/layouters/entity";

export enum EntityKind {
    AbstractClass = "ABSTRACT_CLASS",
    Class = "CLASS",
    Enumeration = "ENUMERATION",
    Interface = "INTERFACE",
    ActivityControlInitialNode = "ACTIVITY_CONTROL_INITIAL_NODE",
    ActivityControlFinalNode = "ACTIVITY_CONTROL_FINAL_NODE",
    ActivityActionNode = "ACTIVITY_ACTION_NODE",
    ActivityObject = "ACTIVITY_OBJECT",
    ActivityMergeNode = "ACTIVITY_MERGE_NODE",
    ActivityForkNode = "ACTIVITY_FORK_NODE",
    ActivityForkNodeHorizontal = "ACTIVITY_FORK_NODE_HORIZONTAL"
}

export enum RelationshipKind {
    Aggregation = "AGGREGATION",
    AssociationBidirectional = "ASSOCIATION_BIDIRECTIONAL",
    AssociationUnidirectional = "ASSOCIATION_UNIDIRECTIONAL",
    Inheritance = "INHERITANCE",
    Composition = "COMPOSITION",
    Dependency = "DEPENDENCY",
    Realization = "REALIZATION",
    ActivityControlFlow = "ACTIVITY_CONTROL_FLOW"
}
