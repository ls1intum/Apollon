import { UMLElement, UMLRelationship, Direction } from '../../..';

export enum ElementType {
  Class = 'Class',
  AbstractClass = 'AbstractClass',
  Interface = 'Interface',
  Enumeration = 'Enumeration',
  ClassAttribute = 'ClassAttribute',
  ClassMethod = 'ClassMethod',
}

export enum RelationshipType {
  ClassBidirectional = 'ClassBidirectional',
  ClassUnidirectional = 'ClassUnidirectional',
  ClassInheritance = 'ClassInheritance',
  ClassRealization = 'ClassRealization',
  ClassDependency = 'ClassDependency',
  ClassAggregation = 'ClassAggregation',
  ClassComposition = 'ClassComposition',
}

export interface UMLClassifier extends UMLElement {
  attributes: string[];
  methods: string[];
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
