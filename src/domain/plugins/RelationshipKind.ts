import { RelationshipKind as UseCaseRelationshipKind } from './use_case_diagram';
import { DiagramType } from '../Diagram';

type RelationshipKind = UseCaseRelationshipKind;
const RelationshipKind = {
  ...UseCaseRelationshipKind,
};

export const DefaultRelationshipKind = {
  [DiagramType.ClassDiagram]: 'BidirectionalAssociation' as UseCaseRelationshipKind,
  [DiagramType.ActivityDiagram]: 'BidirectionalAssociation' as UseCaseRelationshipKind,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipKind.UseCaseAssociation,
};

export default RelationshipKind;
