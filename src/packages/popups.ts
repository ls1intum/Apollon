import { ComponentType } from 'react';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { UMLClassifierUpdate } from './common/uml-classifier/uml-classifier-update';
import { UMLActivityControlFlowUpdate } from './uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-update';
import { UMLActivityMergeNodeUpdate } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node-update';
import { UMLClassAssociationUpdate } from './uml-class-diagram/uml-class-association/uml-class-association-update';
import { UMLCommunicationLinkUpdate } from './uml-communication-diagram/uml-communication-link/uml-communication-link-update';
import { UMLComponentAssociationUpdate } from './uml-component-diagram/uml-component-association-update';
import { UMLDeploymentAssociationUpdate } from './uml-deployment-diagram/uml-deployment-association/uml-deployment-association-update';
import { UMLDeploymentNodeUpdate } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node-update';
import { UMLElementType } from './uml-element-type';
import { UMLObjectNameUpdate } from './uml-object-diagram/uml-object-name/uml-object-name-update';
import { UMLRelationshipType } from './uml-relationship-type';
import { UMLUseCaseAssociationUpdate } from './uml-use-case-diagram/uml-use-case-association/uml-use-case-association-update';

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
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNodeUpdate,
  [UMLElementType.ActivityObjectNode]: DefaultPopup,
  [UMLElementType.UseCase]: DefaultPopup,
  [UMLElementType.UseCaseActor]: DefaultPopup,
  [UMLElementType.UseCaseSystem]: DefaultPopup,
  [UMLElementType.Component]: DefaultPopup,
  [UMLElementType.ComponentInterface]: DefaultPopup,
  [UMLElementType.DeploymentNode]: UMLDeploymentNodeUpdate,
  [UMLElementType.DeploymentArtifact]: DefaultPopup,
  [UMLElementType.DeploymentInterface]: DefaultPopup,
  [UMLRelationshipType.ClassAggregation]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassBidirectional]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassComposition]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassDependency]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassInheritance]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassRealization]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ClassUnidirectional]: UMLClassAssociationUpdate,
  [UMLRelationshipType.ObjectLink]: DefaultRelationshipPopup,
  [UMLRelationshipType.ActivityControlFlow]: UMLActivityControlFlowUpdate,
  [UMLRelationshipType.UseCaseAssociation]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseExtend]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseGeneralization]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.UseCaseInclude]: UMLUseCaseAssociationUpdate,
  [UMLRelationshipType.CommunicationLink]: UMLCommunicationLinkUpdate,
  [UMLRelationshipType.ComponentInterfaceProvided]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.ComponentInterfaceRequired]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.ComponentDependency]: UMLComponentAssociationUpdate,
  [UMLRelationshipType.DeploymentAssociation]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentDependency]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentInterfaceProvided]: UMLDeploymentAssociationUpdate,
  [UMLRelationshipType.DeploymentInterfaceRequired]: UMLDeploymentAssociationUpdate,
};
