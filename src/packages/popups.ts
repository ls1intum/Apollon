import { ComponentType } from 'react';
import { ActivityControlFlowPopup } from './activity-diagram/activity-control-flow/activity-control-flow-popup';
import { ActivityMergeNodePopup } from './activity-diagram/activity-merge-node/activity-merge-node-popup';
import { UMLClassAssociationUpdate } from './class-diagram/uml-class-association/uml-class-association-update';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { UMLClassifierUpdate } from './common/uml-classifier/uml-classifier-update';
import { CommunicationLinkPopup } from './communication-diagram/communication-link/communication-link-popup';
import { ComponentAssociationPopup } from './component-diagram/component-association-popup';
import { DeploymentAssociationPopup } from './deployment-diagram/deployment-association/deployment-association-popup';
import { DeploymentNodePopup } from './deployment-diagram/deployment-node/deployment-node-popup';
import { UMLObjectNameUpdate } from './object-diagram/uml-object-name/uml-object-name-update';
import { UMLElementType } from './uml-element-type';
import { UMLRelationshipType } from './uml-relationship-type';
import { UseCaseAssociationPopup } from './use-case-diagram/use-case-association/use-case-association-popup';

export type Popups = { [key in UMLElementType | UMLRelationshipType]: ComponentType<{ element: any }> | null };
export const Popups: { [key in UMLElementType | UMLRelationshipType]: ComponentType<{ element: any }> | null } = {
  [UMLElementType.Package]: DefaultPopup,
  [UMLElementType.Class]: UMLClassifierUpdate,
  [UMLElementType.AbstractClass]: UMLClassifierUpdate,
  [UMLElementType.Interface]: UMLClassifierUpdate,
  [UMLElementType.Enumeration]: UMLClassifierUpdate,
  [UMLElementType.ClassAttribute]: null,
  [UMLElementType.ClassMethod]: null,
  [UMLElementType.ObjectName]: UMLObjectNameUpdate,
  [UMLElementType.ObjectAttribute]: null,
  [UMLElementType.ObjectMethod]: null,
  [UMLElementType.Activity]: DefaultPopup,
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
  [UMLRelationshipType.ClassAggregation]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassBidirectional]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassComposition]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassDependency]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassInheritance]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassRealization]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassUnidirectional]: UMLClassAssociationUpdate,
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
