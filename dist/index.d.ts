declare module "@ls1intum/apollon" {
    export default class ApollonEditor {
        constructor(container: HTMLElement, options?: ApollonOptions);
        getSelection(): ElementSelection;
        subscribeToSelectionChange(callback: (selection: ElementSelection) => void): number | null;
        unsubscribeFromSelectionChange(subscriptionId: number);
        getState(): State;
        destroy();
    }

    export interface ApollonOptions {
        initialState?: State | null;
        diagramType: "CLASS" | "ACTIVITY";
        mode: "READ_ONLY" | "MODELING_ONLY" | "FULL";
        debug?: boolean;
        theme?: Partial<Theme>;
    }

    export interface ElementSelection {
        entityIds: string[];
        relationshipIds: string[];
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
        Interface = "INTERFACE",
        ActivityControlInitialNode = "ACTIVITY_CONTROL_INITIAL_NODE",
        ActivityControlFinalNode = "ACTIVITY_CONTROL_FINAL_NODE",
        ActivityActionNode = "ACTIVITY_ACTION_NODE",
        ActivityObject = "ACTIVITY_OBJECT",
        ActivityMergeNode = "ACTIVITY_MERGE_NODE",
        ActivityForkNode = "ACTIVITY_FORK_NODE",
        ActivityForkNodeHorizontal = "ACTIVITY_FORK_NODE_HORIZONTAL"
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
        Realization = "REALIZATION",
        ActivityControlFlow = "ACTIVITY_CONTROL_FLOW"
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

    export function layoutDiagram(state: State, layoutOptions: LayoutOptions): LayoutedDiagram;

    export interface LayoutOptions {
        outerPadding: number;
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

    export interface RenderedSVG {
        svg: string;
        size: Size;
    }

    export interface RenderOptions {
        shouldRenderElement: (id: string) => boolean;
        fontFamily: string;
    }

    export function renderDiagramToSVG(
        layoutedDiagram: LayoutedDiagram,
        renderOptions: RenderOptions
    ): RenderedSVG;

    export function renderEntityToSVG(
        layoutedEntity: Entity,
        renderOptions: RenderOptions
    ): RenderedSVG;

    export function renderRelationshipToSVG(
        layoutedRelationship: LayoutedRelationship,
        renderOptions: RenderOptions
    ): RenderedSVG;

    export function computeBoundingBox(points: Point[]): Rect;

    export interface Rect {
        x: number;
        y: number;
        width: number;
        height: number;
    }

    export const ENTITY_KIND_HEIGHT;
    export const ENTITY_NAME_HEIGHT;
    export const ENTITY_MEMBER_HEIGHT;
    export const ENTITY_MEMBER_LIST_VERTICAL_PADDING;
}
