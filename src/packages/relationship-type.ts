import { ActivityRelationshipType } from './activity-diagram';
import { ClassRelationshipType } from './class-diagram';
import { CommunicationRelationshipType } from './communication-diagram';
import { UMLDiagramType } from './diagram-type';
import { ObjectRelationshipType } from './object-diagram';
import { UseCaseRelationshipType } from './use-case-diagram';

export type RelationshipType =
  | ClassRelationshipType
  | ObjectRelationshipType
  | ActivityRelationshipType
  | UseCaseRelationshipType
  | CommunicationRelationshipType;

export const RelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
  ...CommunicationRelationshipType,
};

export const DefaultRelationshipType: { [type in UMLDiagramType]: RelationshipType } = {
  [UMLDiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [UMLDiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [UMLDiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [UMLDiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
  [UMLDiagramType.CommunicationDiagram]: CommunicationRelationshipType.CommunicationLink,
};
