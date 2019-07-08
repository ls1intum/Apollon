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
