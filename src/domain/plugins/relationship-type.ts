import { RelationshipType as CommonRelationshipType } from './Common';
import { RelationshipType as ClassRelationshipType } from './ClassDiagram';
import { RelationshipType as ObjectRelationshipType } from './ObjectDiagram';
import { RelationshipType as ActivityRelationshipType } from './ActivityDiagram';
import { RelationshipType as UseCaseRelationshipType } from './UseCaseDiagram';
import { DiagramType } from './diagram-type';

export type RelationshipType =
  | CommonRelationshipType
  | ClassRelationshipType
  | ObjectRelationshipType
  | ActivityRelationshipType
  | UseCaseRelationshipType;

export const RelationshipType = {
  ...CommonRelationshipType,
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
};

export const DefaultRelationshipType: { [type in DiagramType]: RelationshipType } = {
  [DiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [DiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [DiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
};
