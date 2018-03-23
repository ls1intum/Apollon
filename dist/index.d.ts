declare module "apollon" {
    export default class ApollonEditor {
        constructor(container: HTMLElement, options?: ApollonOptions);
        getState(): State;
        destroy();
    }

    export interface ApollonOptions {
        initialState?: State | null;
        readOnly?: boolean;
        theme?: Partial<Theme>;
    }

    export interface State {
        entities: {
            byId: { [id: string]: Entity };
            allIds: string[];
        };

        relationships: {
            byId: { [id: string]: Relationship };
            allIds: string[];
        };

        interactiveElements: {
            allIds: string[];
        };

        editor: {
            canvasSize: Size;
            gridSize: number;
        };
    }

    export interface Entity {
        id: string;
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
        id: string;
        name: string;
    }

    export interface EntityRenderMode {
        showAttributes: boolean;
        showMethods: boolean;
    }

    export interface Relationship {
        id: string;
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
        entityId: string;
        multiplicity: string | null;
        role: string | null;
        edge: RectEdge;
        edgeOffset: number;
    }

    export type RectEdge = "TOP" | "LEFT" | "RIGHT" | "BOTTOM";

    export interface Point {
        x: number;
        y: number;
    }

    export interface Size {
        width: number;
        height: number;
    }

    export interface Theme {
        primaryColor: string;
        borderColor: string;
        highlightColor: string;
        highlightColorDarker: string;
        highlightBorderColor: string;
        interactiveAreaColor: string;
        interactiveAreaHoverColor: string;
        fontFamily: string;
        headingFontFamily: string;
        headingFontWeight: FontWeight;
    }

    type CSSWideKeyword = "initial" | "inherit" | "unset";

    type FontWeight =
        | CSSWideKeyword
        | "normal"
        | "bold"
        | "bolder"
        | "lighter"
        | 100
        | 200
        | 300
        | 400
        | 500
        | 600
        | 700
        | 800
        | 900;

    export function layoutDiagram(layoutOptions: LayoutOptions): LayoutedDiagram;

    export function renderDiagramToSVG(
        layoutedDiagram: LayoutedDiagram,
        renderOptions: RenderOptions
    ): string;

    export function renderEntityToSVG(
        layoutedEntity: LayoutedEntity,
        renderOptions: RenderOptions
    ): string;

    export function renderRelationshipToSVG(
        layoutedRelationship: LayoutedRelationship,
        renderOptions: RenderOptions
    ): string;

    export interface LayoutOptions {
        outerPadding: number;
    }

    export interface RenderOptions {
        shouldRenderElement: (id: string) => boolean;
        fontFamily: string;
    }

    export interface LayoutedDiagram {
        size: Size;
        entities: LayoutedEntity[];
        relationships: LayoutedRelationship[];
    }

    export interface LayoutedEntity {
        id: string;
        kind: EntityKind;
        name: string;
        position: Point;
        size: Size;
        attributes: LayoutedEntityMember[];
        methods: LayoutedEntityMember[];
        renderMode: EntityRenderMode;
    }

    export interface LayoutedEntityMember {
        id: string;
        name: string;
        position: Point;
        size: Size;
    }

    export interface LayoutedRelationship {
        relationship: Relationship;
        path: Point[];
    }
}
