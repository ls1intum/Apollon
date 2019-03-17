import { RelationshipKind as CommonRelationshipKind } from './Common';
import { RelationshipKind as ClassRelationshipKind } from './ClassDiagram';
import { RelationshipKind as UseCaseRelationshipKind } from './UseCaseDiagram';
import DiagramType from './DiagramType';

type RelationshipKind =
  | CommonRelationshipKind
  | ClassRelationshipKind
  | UseCaseRelationshipKind;

const RelationshipKind = {
  ...CommonRelationshipKind,
  ...ClassRelationshipKind,
  ...UseCaseRelationshipKind,
};

export const DefaultRelationshipKind: {
  [type in DiagramType]: RelationshipKind
} = {
  [DiagramType.ClassDiagram]:
    ClassRelationshipKind.ClassBidirectional,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipKind.UseCaseAssociation,
};

export default RelationshipKind;
