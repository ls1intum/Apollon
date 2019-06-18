import { ActivityRelationshipType } from './activity-diagram';
import { ClassRelationshipType } from './class-diagram';
import { CommunicationRelationshipType } from './communication-diagram';
import { UMLDiagramType } from './diagram-type';
import { ObjectRelationshipType } from './object-diagram';
import { UseCaseRelationshipType } from './use-case-diagram';

export type UMLRelationshipType =
  | ClassRelationshipType
  | ObjectRelationshipType
  | ActivityRelationshipType
  | UseCaseRelationshipType
  | CommunicationRelationshipType;

export const UMLRelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
  ...CommunicationRelationshipType,
};

export const DefaultUMLRelationshipType: { [type in UMLDiagramType]: UMLRelationshipType } = {
  [UMLDiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [UMLDiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [UMLDiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [UMLDiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
  [UMLDiagramType.CommunicationDiagram]: CommunicationRelationshipType.CommunicationLink,
};
