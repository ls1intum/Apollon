import { Element, UMLElement, UMLRelationship, Direction } from '../../..';

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

export interface UMLClassMember extends Element {}

export interface UMLClassifier extends UMLElement {
  attributes: UMLClassMember[];
  methods: UMLClassMember[];
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
