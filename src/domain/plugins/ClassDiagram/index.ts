import { UMLElement, UMLRelationship, Location } from '../../../ApollonEditor';

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
  attributes: { id: string; name: string }[];
  methods: { id: string; name: string }[];
}

export interface UMLClassAssociation extends UMLRelationship {
  source: {
    element: string;
    location: Location;
    multiplicity: string;
    role: string;
  };
  target: {
    element: string;
    location: Location;
    multiplicity: string;
    role: string;
  };
}
