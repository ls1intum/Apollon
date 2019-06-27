import { ComponentClass } from 'react';
import { ActivityControlFlowPopup } from './activity-diagram/activity-control-flow/activity-control-flow-popup';
import { ActivityMergeNodePopup } from './activity-diagram/activity-merge-node/activity-merge-node-popup';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { ClassAssociationPopup } from './common/uml-association/uml-association-update';
import { UMLClassifierUpdate } from './common/uml-classifier/uml-classifier-update';
import { CommunicationLinkPopup } from './communication-diagram/communication-link/communication-link-popup';
import { ComponentAssociationPopup } from './component-diagram/component-association-popup';
import { DeploymentAssociationPopup } from './deployment-diagram/deployment-association/deployment-association-popup';
import { DeploymentNodePopup } from './deployment-diagram/deployment-node/deployment-node-popup';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
import { UMLElementType } from './uml-element-type';
import { UMLRelationshipType } from './uml-relationship-type';
import { UseCaseAssociationPopup } from './use-case-diagram/use-case-association/use-case-association-popup';

export type Popups = { [key in UMLElementType | UMLRelationshipType]: ComponentClass<{ element: any }> | null };
export const Popups: { [key in UMLElementType | UMLRelationshipType]: ComponentClass<{ element: any }> | null } = {
  [UMLElementType.Package]: DefaultPopup,
  [UMLElementType.Class]: UMLClassifierUpdate,
  [UMLElementType.AbstractClass]: UMLClassifierUpdate,
  [UMLElementType.Interface]: UMLClassifierUpdate,
  [UMLElementType.Enumeration]: UMLClassifierUpdate,
  [UMLElementType.ClassAttribute]: null,
  [UMLElementType.ClassMethod]: null,
  [UMLElementType.ObjectName]: ObjectNamePopup,
  [UMLElementType.ObjectAttribute]: null,
  [UMLElementType.ObjectMethod]: null,
  [UMLElementType.ActivityActionNode]: DefaultPopup,
  [UMLElementType.ActivityFinalNode]: DefaultPopup,
  [UMLElementType.ActivityForkNode]: DefaultPopup,
  [UMLElementType.ActivityInitialNode]: DefaultPopup,
  [UMLElementType.ActivityMergeNode]: ActivityMergeNodePopup,
  [UMLElementType.ActivityObjectNode]: DefaultPopup,
  [UMLElementType.UseCase]: DefaultPopup,
  [UMLElementType.UseCaseActor]: DefaultPopup,
  [UMLElementType.UseCaseSystem]: DefaultPopup,
  [UMLElementType.Component]: DefaultPopup,
  [UMLElementType.ComponentInterface]: DefaultPopup,
  [UMLElementType.DeploymentNode]: DeploymentNodePopup,
  [UMLElementType.DeploymentArtifact]: DefaultPopup,
  [UMLRelationshipType.ClassAggregation]: ClassAssociationPopup,
  [UMLRelationshipType.ClassBidirectional]: ClassAssociationPopup,
  [UMLRelationshipType.ClassComposition]: ClassAssociationPopup,
  [UMLRelationshipType.ClassDependency]: ClassAssociationPopup,
  [UMLRelationshipType.ClassInheritance]: ClassAssociationPopup,
  [UMLRelationshipType.ClassRealization]: ClassAssociationPopup,
  [UMLRelationshipType.ClassUnidirectional]: ClassAssociationPopup,
  [UMLRelationshipType.ObjectLink]: DefaultRelationshipPopup,
  [UMLRelationshipType.ActivityControlFlow]: ActivityControlFlowPopup,
  [UMLRelationshipType.UseCaseAssociation]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseExtend]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseGeneralization]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseInclude]: UseCaseAssociationPopup,
  [UMLRelationshipType.CommunicationLink]: CommunicationLinkPopup,
  [UMLRelationshipType.ComponentInterfaceProvided]: ComponentAssociationPopup,
  [UMLRelationshipType.ComponentInterfaceRequired]: ComponentAssociationPopup,
  [UMLRelationshipType.ComponentDependency]: ComponentAssociationPopup,
  [UMLRelationshipType.DeploymentAssociation]: DeploymentAssociationPopup,
};
