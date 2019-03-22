import { UMLElement, UMLRelationship, Direction } from '../../..';

export enum ElementKind {
  Class = 'Class',
  AbstractClass = 'AbstractClass',
  Interface = 'Interface',
  Enumeration = 'Enumeration',
  ClassAttribute = 'ClassAttribute',
  ClassMethod = 'ClassMethod',
}

export enum RelationshipKind {
  ClassBidirectional = 'ClassBidirectional',
  ClassUnidirectional = 'ClassUnidirectional',
  ClassInheritance = 'ClassInheritance',
  ClassRealization = 'ClassRealization',
  ClassDependency = 'ClassDependency',
  ClassAggregation = 'ClassAggregation',
  ClassComposition = 'ClassComposition',
}

export interface UMLClassifier extends UMLElement {
  attributes: {
    id: string;
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
  }[];
  methods: {
    id: string;
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
  }[];
}

export interface UMLClassAssociation extends UMLRelationship {
  source: {
    element: string;
    direction: Direction;
    multiplicity: string;
    role: string;
  };
  target: {
    element: string;
    direction: Direction;
    multiplicity: string;
    role: string;
  };
}
