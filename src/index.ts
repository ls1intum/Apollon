import Editor from "./Editor";

export { computeBoundingBox } from "./domain/geo/boundingBox";

export * from "./Editor";
export default Editor;

export const layoutDiagram = Editor.layoutDiagram;

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

// export enum EntityKind {
//     AbstractClass = "ABSTRACT_CLASS",
//     Class = "CLASS",
//     Enumeration = "ENUMERATION",
//     Interface = "INTERFACE",
//     ActivityControlInitialNode = "ACTIVITY_CONTROL_INITIAL_NODE",
//     ActivityControlFinalNode = "ACTIVITY_CONTROL_FINAL_NODE",
//     ActivityActionNode = "ACTIVITY_ACTION_NODE",
//     ActivityObject = "ACTIVITY_OBJECT",
//     ActivityMergeNode = "ACTIVITY_MERGE_NODE",
//     ActivityForkNode = "ACTIVITY_FORK_NODE",
//     ActivityForkNodeHorizontal = "ACTIVITY_FORK_NODE_HORIZONTAL"
// }

export const enum EntityKind {
    AbstractClass = "AbstractClass",
    Class = "Class",
    Enumeration = "Enumeration",
    Interface = "Interface",
    InitialNode = "InitialNode",
    FinalNode = "FinalNode",
    ActionNode = "ActionNode",
    ObjectNode = "ObjectNode",
    MergeNode = "MergeNode",
    ForkNode = "ForkNode",
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
