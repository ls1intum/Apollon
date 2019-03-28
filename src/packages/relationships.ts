import { RelationshipType } from './relationship-type';
import { Relationship, IRelationship } from '../services/relationship/relationship';
import { UMLRelationship } from '../typings';
import { ClassAggregation } from './class-diagram/class-association/class-aggregation/class-aggregation';
import { ClassBidirectional } from './class-diagram/class-association/class-bidirectional/class-bidirectional';
import { ClassComposition } from './class-diagram/class-association/class-composition/class-composition';
import { ClassDependency } from './class-diagram/class-association/class-dependency/class-dependency';
import { ClassInheritance } from './class-diagram/class-association/class-inheritance/class-inheritance';
import { ClassRealization } from './class-diagram/class-association/class-realization/class-realization';
import { ClassUnidirectional } from './class-diagram/class-association/class-unidirectional/class-unidirectional';
import { ObjectLink } from './object-diagram/object-link/object-link';
import { ActivityControlFlow } from './activity-diagram/activity-control-flow/activity-control-flow';
// import { UseCaseAssociation } from './UseCaseDiagram/UseCaseAssociation';
// import { UseCaseExtend } from './UseCaseDiagram/UseCaseExtend';
// import { UseCaseGeneralization } from './UseCaseDiagram/UseCaseGeneralization';
// import { UseCaseInclude } from './UseCaseDiagram/UseCaseInclude';

type Relationships = {
  [key in RelationshipType]: new (values?: IRelationship | UMLRelationship) => Relationship;
}

export const Relationships = {
  [RelationshipType.ClassAggregation]: ClassAggregation,
  [RelationshipType.ClassBidirectional]: ClassBidirectional,
  [RelationshipType.ClassComposition]: ClassComposition,
  [RelationshipType.ClassDependency]: ClassDependency,
  [RelationshipType.ClassInheritance]: ClassInheritance,
  [RelationshipType.ClassRealization]: ClassRealization,
  [RelationshipType.ClassUnidirectional]: ClassUnidirectional,
  [RelationshipType.ObjectLink]: ObjectLink,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlow,
  // [RelationshipType.UseCaseAssociation]: UseCaseAssociation,
  // [RelationshipType.UseCaseExtend]: UseCaseExtend,
  // [RelationshipType.UseCaseGeneralization]: UseCaseGeneralization,
  // [RelationshipType.UseCaseInclude]: UseCaseInclude,
};
