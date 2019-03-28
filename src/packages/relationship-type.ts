import { ClassRelationshipType } from './class-diagram';
import { ObjectRelationshipType } from './object-diagram';
// import { RelationshipType as ActivityRelationshipType } from './ActivityDiagram';
// import { RelationshipType as UseCaseRelationshipType } from './UseCaseDiagram';
import { DiagramType } from './diagram-type';

export type RelationshipType = ClassRelationshipType | ObjectRelationshipType;
// | ActivityRelationshipType
// | UseCaseRelationshipType;

export const RelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  // ...ActivityRelationshipType,
  // ...UseCaseRelationshipType,
};

export const DefaultRelationshipType: { [type in DiagramType]: RelationshipType } = {
  [DiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [DiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  // [DiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  // [DiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
};
