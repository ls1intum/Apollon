import { Direction, UMLElement, UMLRelationship } from '../../typings';

export enum ClassElementType {
  Package = 'Package',
  Class = 'Class',
  AbstractClass = 'AbstractClass',
  Interface = 'Interface',
  Enumeration = 'Enumeration',
  ClassAttribute = 'ClassAttribute',
  ClassMethod = 'ClassMethod',
}

export enum ClassRelationshipType {
  ClassBidirectional = 'ClassBidirectional',
  ClassUnidirectional = 'ClassUnidirectional',
  ClassInheritance = 'ClassInheritance',
  ClassRealization = 'ClassRealization',
  ClassDependency = 'ClassDependency',
  ClassAggregation = 'ClassAggregation',
  ClassComposition = 'ClassComposition',
}

export interface UMLClass extends UMLElement {
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
