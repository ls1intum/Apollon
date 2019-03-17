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
  owner: string | null;
  ownedElements: string[];
  renderMode: EntityRenderMode;
}

export const enum EntityKind {
  AbstractClass = 'AbstractClass',
  Class = 'Class',
  Enumeration = 'Enumeration',
  Interface = 'Interface',
  ActivityControlInitialNode = 'InitialNode',
  ActivityControlFinalNode = 'FinalNode',
  ActivityActionNode = 'ActionNode',
  ActivityObject = 'ObjectNode',
  ActivityMergeNode = 'MergeNode',
  ActivityForkNode = 'ForkNode',
  ActivityForkNodeHorizontal = 'ForkNodeHorizontal',
  UseCase = 'UseCase',
  UseCaseActor = 'Actor',
  UseCaseSystem = 'System',
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

export enum RelationshipKind {
  ClassAggregation = 'AGGREGATION',
  ClassBidirectional = 'ASSOCIATION_BIDIRECTIONAL',
  ClassUnidirectional = 'ASSOCIATION_UNIDIRECTIONAL',
  ClassInheritance = 'INHERITANCE',
  ClassComposition = 'COMPOSITION',
  ClassDependency = 'DEPENDENCY',
  ClassRealization = 'REALIZATION',
  ActivityControlFlow = 'ACTIVITY_CONTROL_FLOW',
  UseCaseAssociation = 'USE_CASE_ASSOCIATION',
  UseCaseGeneralization = 'USE_CASE_GENERALIZATION',
  UseCaseInclude = 'USE_CASE_INCLUDE',
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
  version: string;

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
