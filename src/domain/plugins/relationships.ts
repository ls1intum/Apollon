import { RelationshipType } from './relationship-type';
import { Relationship, IRelationship } from '../../services/relationship';
import { UMLRelationship } from '../..';
import { ClassAggregation } from './ClassDiagram/ClassAssociation/ClassAggregation';
import { ClassBidirectional } from './ClassDiagram/ClassAssociation/ClassBidirectional';
import { ClassComposition } from './ClassDiagram/ClassAssociation/ClassComposition';
import { ClassDependency } from './ClassDiagram/ClassAssociation/ClassDependency';
import { ClassInheritance } from './ClassDiagram/ClassAssociation/ClassInheritance';
import { ClassRealization } from './ClassDiagram/ClassAssociation/ClassRealization';
import { ClassUnidirectional } from './ClassDiagram/ClassAssociation/ClassUnidirectional';
import { ObjectLink } from './ObjectDiagram/ObjectLink';
import { ActivityControlFlow } from './ActivityDiagram/ActivityControlFlow';
import { UseCaseAssociation } from './UseCaseDiagram/UseCaseAssociation';
import { UseCaseExtend } from './UseCaseDiagram/UseCaseExtend';
import { UseCaseGeneralization } from './UseCaseDiagram/UseCaseGeneralization';
import { UseCaseInclude } from './UseCaseDiagram/UseCaseInclude';

export const relationships: { [key in RelationshipType]: new (values?: IRelationship | UMLRelationship) => Relationship } = {
  [RelationshipType.ClassAggregation]: ClassAggregation,
  [RelationshipType.ClassBidirectional]: ClassBidirectional,
  [RelationshipType.ClassComposition]: ClassComposition,
  [RelationshipType.ClassDependency]: ClassDependency,
  [RelationshipType.ClassInheritance]: ClassInheritance,
  [RelationshipType.ClassRealization]: ClassRealization,
  [RelationshipType.ClassUnidirectional]: ClassUnidirectional,
  [RelationshipType.ObjectLink]: ObjectLink,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlow,
  [RelationshipType.UseCaseAssociation]: UseCaseAssociation,
  [RelationshipType.UseCaseExtend]: UseCaseExtend,
  [RelationshipType.UseCaseGeneralization]: UseCaseGeneralization,
  [RelationshipType.UseCaseInclude]: UseCaseInclude,
};
