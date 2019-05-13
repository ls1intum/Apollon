import { ActivityRelationshipType } from './activity-diagram';
import { ClassRelationshipType } from './class-diagram';
import { CommunicationRelationshipType } from './communication-diagram';
import { ComponentRelationshipType } from './component-diagram';
import { DeploymentRelationshipType } from './deployment-diagram';
import { DiagramType } from './diagram-type';
import { ObjectRelationshipType } from './object-diagram';
import { UseCaseRelationshipType } from './use-case-diagram';

export type RelationshipType =
  | ClassRelationshipType
  | ObjectRelationshipType
  | ActivityRelationshipType
  | UseCaseRelationshipType
  | CommunicationRelationshipType
  | ComponentRelationshipType
  | DeploymentRelationshipType;

export const RelationshipType = {
  ...ClassRelationshipType,
  ...ObjectRelationshipType,
  ...ActivityRelationshipType,
  ...UseCaseRelationshipType,
  ...CommunicationRelationshipType,
  ...ComponentRelationshipType,
  ...DeploymentRelationshipType,
};

export const DefaultRelationshipType: { [type in DiagramType]: RelationshipType } = {
  [DiagramType.ClassDiagram]: ClassRelationshipType.ClassBidirectional,
  [DiagramType.ObjectDiagram]: ObjectRelationshipType.ObjectLink,
  [DiagramType.ActivityDiagram]: ActivityRelationshipType.ActivityControlFlow,
  [DiagramType.UseCaseDiagram]: UseCaseRelationshipType.UseCaseAssociation,
  [DiagramType.CommunicationDiagram]: CommunicationRelationshipType.CommunicationLink,
  [DiagramType.ComponentDiagram]: ComponentRelationshipType.ComponentDependency,
  [DiagramType.DeploymentDiagram]: DeploymentRelationshipType.DeploymentAssociation,
};
