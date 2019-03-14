import { RelationshipKind as UseCaseRelationshipKind } from './UseCaseDiagram';
import { DiagramType } from '../Diagram';

type RelationshipKind = UseCaseRelationshipKind;
const RelationshipKind = {
  ...UseCaseRelationshipKind,
};

export const DefaultRelationshipKind: {
  [type in DiagramType]: RelationshipKind
} = {
  [DiagramType.ClassDiagram]: 'BidirectionalAssociation' as RelationshipKind,
  [DiagramType.ActivityDiagram]: 'BidirectionalAssociation' as RelationshipKind,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipKind.UseCaseInclude,
};

export default RelationshipKind;
