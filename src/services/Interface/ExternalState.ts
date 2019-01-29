export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
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
  Aggregation = 'AGGREGATION',
  AssociationBidirectional = 'ASSOCIATION_BIDIRECTIONAL',
  AssociationUnidirectional = 'ASSOCIATION_UNIDIRECTIONAL',
  Inheritance = 'INHERITANCE',
  Composition = 'COMPOSITION',
  Dependency = 'DEPENDENCY',
  Realization = 'REALIZATION',
  ActivityControlFlow = 'ACTIVITY_CONTROL_FLOW',
}

export interface RelationshipEnd {
  entityId: string;
  multiplicity: string | null;
  role: string | null;
  edge: RectEdge;
  edgeOffset: number;
}
export type RectEdge = 'TOP' | 'LEFT' | 'RIGHT' | 'BOTTOM';

export interface ExternalState {
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
