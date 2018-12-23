import Element from './../domain/Element';
import { Point, RectEdge, Size } from "./geometry";
import { UUID } from './../domain/utils/uuid';
import { EntityMember } from '../domain/plugins/class/Member';

export interface UMLModel {
    entities: Element[];
    relationships: Relationship[];
}

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

export interface EntityRenderMode {
    showAttributes: boolean;
    showMethods: boolean;
}

export interface Relationship extends Element {
    kind: RelationshipKind;
    source: RelationshipEnd;
    target: RelationshipEnd;
    straightLine: boolean;
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
    source: Element;
    target: Element;
    path: Point[];
}
