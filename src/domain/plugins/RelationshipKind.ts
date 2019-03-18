import { RelationshipKind as CommonRelationshipKind } from './Common';
import { RelationshipKind as ClassRelationshipKind } from './ClassDiagram';
import { RelationshipKind as ActivityRelationshipKind } from './ActivityDiagram';
import { RelationshipKind as UseCaseRelationshipKind } from './UseCaseDiagram';
import DiagramType from './DiagramType';

type RelationshipKind =
  | CommonRelationshipKind
  | ClassRelationshipKind
  | ActivityRelationshipKind
  | UseCaseRelationshipKind;

const RelationshipKind = {
  ...CommonRelationshipKind,
  ...ClassRelationshipKind,
  ...ActivityRelationshipKind,
  ...UseCaseRelationshipKind,
};

export const DefaultRelationshipKind: {
  [type in DiagramType]: RelationshipKind
} = {
  [DiagramType.ClassDiagram]: ClassRelationshipKind.ClassBidirectional,
  [DiagramType.ActivityDiagram]: ActivityRelationshipKind.ActivityControlFlow,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipKind.UseCaseAssociation,
};

export default RelationshipKind;
