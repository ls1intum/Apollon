import { RelationshipKind as ClassRelationshipKind } from './ClassDiagram';
import { RelationshipKind as UseCaseRelationshipKind } from './UseCaseDiagram';
import { DiagramType } from '../Diagram';

type RelationshipKind = ClassRelationshipKind | UseCaseRelationshipKind;
const RelationshipKind = {
  ...ClassRelationshipKind,
  ...UseCaseRelationshipKind,
};

export const DefaultRelationshipKind: {
  [type in DiagramType]: RelationshipKind
} = {
  [DiagramType.ClassDiagram]: ClassRelationshipKind.ClassAssociation,
  [DiagramType.ActivityDiagram]: 'BidirectionalAssociation' as RelationshipKind,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipKind.UseCaseAssociation,
};

export default RelationshipKind;
