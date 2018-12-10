import Element from './../domain/Element';
import { Point, RectEdge, Size } from "./geometry";
import { UUID } from './../domain/utils/uuid';

export interface UMLModel {
    entities: Entity[];
    relationships: Relationship[];
}

export interface Entity extends Element {
    name: string;
    attributes: EntityMember[];
    methods: EntityMember[];
    renderMode: EntityRenderMode;
    render(): JSX.Element;
}

export const enum EntityKind {
    AbstractClass = "AbstractClass",
    Class = "Class",
    Enumeration = "Enumeration",
    Interface = "Interface",
    ActivityControlInitialNode = "ACTIVITY_CONTROL_INITIAL_NODE",
    ActivityControlFinalNode = "ACTIVITY_CONTROL_FINAL_NODE",
    ActivityActionNode = "ACTIVITY_ACTION_NODE",
    ActivityObject = "ACTIVITY_OBJECT",
    ActivityMergeNode = "ACTIVITY_MERGE_NODE",
    ActivityForkNode = "ACTIVITY_FORK_NODE",
    ActivityForkNodeHorizontal = "ACTIVITY_FORK_NODE_HORIZONTAL"
}

export interface EntityMember {
    id: UUID;
    name: string;
}

export interface EntityRenderMode {
    showAttributes: boolean;
    showMethods: boolean;
}

export interface Relationship extends Element {
    kind: RelationshipKind;
    source: RelationshipEnd;
    target: RelationshipEnd;
    straightLine: boolean;
    render(): JSX.Element;
}

export const enum RelationshipKind {
    Aggregation = "AGGREGATION",
    AssociationBidirectional = "ASSOCIATION_BIDIRECTIONAL",
    AssociationUnidirectional = "ASSOCIATION_UNIDIRECTIONAL",
    Inheritance = "INHERITANCE",
    Composition = "COMPOSITION",
    Dependency = "DEPENDENCY",
    Realization = "REALIZATION",
    ActivityControlFlow = "ACTIVITY_CONTROL_FLOW"
}

export interface RelationshipEnd {
    entityId: UUID;
    multiplicity: string | null;
    role: string | null;
    edge: RectEdge;
    edgeOffset: number;
}

export interface LayoutedRelationship {
    relationship: Relationship;
    source: Entity;
    target: Entity;
    path: Point[];
}
