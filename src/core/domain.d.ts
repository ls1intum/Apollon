import { Point, RectEdge, Size } from "./geometry";
import { UUID } from "./utils/uuid";

export interface UMLModel {
    entities: Entity[];
    relationships: Relationship[];
}

export interface Entity {
    id: UUID;
    kind: EntityKind;
    name: string;
    position: Point;
    size: Size;
    attributes: EntityMember[];
    methods: EntityMember[];
    renderMode: EntityRenderMode;
}

export const enum EntityKind {
    AbstractClass = "ABSTRACT_CLASS",
    Class = "CLASS",
    Enumeration = "ENUMERATION",
    Interface = "INTERFACE"
}

export interface EntityMember {
    id: UUID;
    name: string;
}

export interface EntityRenderMode {
    showAttributes: boolean;
    showMethods: boolean;
}

export interface Relationship {
    id: UUID;
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
    Realization = "REALIZATION"
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

export interface ElementSelection {
    entityIds: UUID[];
    relationshipIds: UUID[];
}

export const enum EditorMode {
    ModelingView = "MODELING_VIEW",
    InteractiveElementsView = "INTERACTIVE_AREAS_VIEW"
}

export const enum InteractiveElementsMode {
    Hidden = "HIDDEN",
    Highlighted = "HIGHLIGHTED"
}
