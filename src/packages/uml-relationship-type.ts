import { UMLDiagramType } from './diagram-type';
import { ActivityRelationshipType } from './uml-activity-diagram';
import { ClassRelationshipType } from './uml-class-diagram';
import { CommunicationRelationshipType } from './uml-communication-diagram';
import { ComponentRelationshipType } from './uml-component-diagram';
import { DeploymentRelationshipType } from './uml-deployment-diagram';
import { ObjectRelationshipType } from './uml-object-diagram';
import { UseCaseRelationshipType } from './uml-use-case-diagram';

export type UMLRelationshipType =
  | ClassRelationshipType
  | ObjectRelationshipType
  | ActivityRelationshipType
  | UseCaseRelationshipType
  | CommunicationRelationshipType
  | ComponentRelationshipType
  | DeploymentRelationshipType;

export const UMLRelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
  ...CommunicationRelationshipType,
  ...ComponentRelationshipType,
  ...DeploymentRelationshipType,
};

export const DefaultUMLRelationshipType: { [type in UMLDiagramType]: UMLRelationshipType } = {
  [UMLDiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [UMLDiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [UMLDiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [UMLDiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
  [UMLDiagramType.CommunicationDiagram]: CommunicationRelationshipType.CommunicationLink,
  [UMLDiagramType.ComponentDiagram]: ComponentRelationshipType.ComponentInterfaceProvided,
  [UMLDiagramType.DeploymentDiagram]: DeploymentRelationshipType.DeploymentAssociation,
};
