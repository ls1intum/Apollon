import { FunctionComponent } from 'react';
import { ActivityActionNodeComponent } from './activity-diagram/activity-action-node/activity-action-node-component';
import { ActivityControlFlowComponent } from './activity-diagram/activity-control-flow/activity-control-flow-component';
import { ActivityFinalNodeComponent } from './activity-diagram/activity-final-node/activity-final-node-component';
import { ActivityForkNodeComponent } from './activity-diagram/activity-fork-node/activity-fork-node-component';
import { ActivityInitialNodeComponent } from './activity-diagram/activity-initial-node/activity-initial-node-component';
import { ActivityMergeNodeComponent } from './activity-diagram/activity-merge-node/activity-merge-node-component';
import { ActivityObjectNodeComponent } from './activity-diagram/activity-object-node/activity-object-node-component';
import { ActivityComponent } from './activity-diagram/activity/activity-component';
import { UMLClassPackageComponent } from './class-diagram/uml-class-package/uml-class-package-component';
import { UMLAssociationComponent } from './common/uml-association/uml-association-component';
import { UMLClassifierComponent } from './common/uml-classifier/uml-classifier-component';
import { UMLClassifierMemberComponent } from './common/uml-classifier/uml-classifier-member-component';
import { CommunicationLinkComponent } from './communication-diagram/communication-link/communication-link-component';
import { ComponentDependencyComponent } from './component-diagram/component-dependency/component-dependency-component';
import { ComponentInterfaceProvidedComponent } from './component-diagram/component-interface-provided/component-interface-provided-component';
import { ComponentInterfaceRequiredComponent } from './component-diagram/component-interface-required/component-interface-required-component';
import { ComponentInterfaceComponent } from './component-diagram/component-interface/component-interface-component';
import { ComponentComponent } from './component-diagram/component/component-component';
import { DeploymentArtifactComponent } from './deployment-diagram/deployment-artifact/deployment-artifact-component';
import { DeploymentAssociationComponent } from './deployment-diagram/deployment-association/deployment-association-component';
import { DeploymentNodeComponent } from './deployment-diagram/deployment-node/deployment-node-component';
import { UMLObjectLinkComponent } from './object-diagram/uml-object-link/uml-object-link-component';
import { UMLElementType } from './uml-element-type';
import { UMLRelationshipType } from './uml-relationship-type';
import { UseCaseActorComponent } from './use-case-diagram/use-case-actor/use-case-actor-component';
import { UseCaseAssociationComponent } from './use-case-diagram/use-case-association/use-case-association-component';
import { UseCaseExtendComponent } from './use-case-diagram/use-case-extend/use-case-extend-component';
import { UseCaseGeneralizationComponent } from './use-case-diagram/use-case-generalization/use-case-generalization-component';
import { UseCaseIncludeComponent } from './use-case-diagram/use-case-include/use-case-include-component';
import { UseCaseSystemComponent } from './use-case-diagram/use-case-system/use-case-system-component';
import { UseCaseComponent } from './use-case-diagram/use-case/use-case-component';

export const Components: { [key in UMLElementType | UMLRelationshipType]: FunctionComponent<{ element: any }> } = {
  [UMLElementType.Package]: UMLClassPackageComponent,
  [UMLElementType.Class]: UMLClassifierComponent,
  [UMLElementType.AbstractClass]: UMLClassifierComponent,
  [UMLElementType.Interface]: UMLClassifierComponent,
  [UMLElementType.Enumeration]: UMLClassifierComponent,
  [UMLElementType.ClassAttribute]: UMLClassifierMemberComponent,
  [UMLElementType.ClassMethod]: UMLClassifierMemberComponent,
  [UMLElementType.ObjectName]: UMLClassifierComponent,
  [UMLElementType.ObjectAttribute]: UMLClassifierMemberComponent,
  [UMLElementType.ObjectMethod]: UMLClassifierMemberComponent,
  [UMLElementType.Activity]: ActivityComponent,
  [UMLElementType.ActivityActionNode]: ActivityActionNodeComponent,
  [UMLElementType.ActivityFinalNode]: ActivityFinalNodeComponent,
  [UMLElementType.ActivityForkNode]: ActivityForkNodeComponent,
  [UMLElementType.ActivityInitialNode]: ActivityInitialNodeComponent,
  [UMLElementType.ActivityMergeNode]: ActivityMergeNodeComponent,
  [UMLElementType.ActivityObjectNode]: ActivityObjectNodeComponent,
  [UMLElementType.UseCase]: UseCaseComponent,
  [UMLElementType.UseCaseActor]: UseCaseActorComponent,
  [UMLElementType.UseCaseSystem]: UseCaseSystemComponent,
  [UMLElementType.Component]: ComponentComponent,
  [UMLElementType.ComponentInterface]: ComponentInterfaceComponent,
  [UMLElementType.DeploymentNode]: DeploymentNodeComponent,
  [UMLElementType.DeploymentArtifact]: DeploymentArtifactComponent,
  [UMLRelationshipType.ClassAggregation]: UMLAssociationComponent,
  [UMLRelationshipType.ClassBidirectional]: UMLAssociationComponent,
  [UMLRelationshipType.ClassComposition]: UMLAssociationComponent,
  [UMLRelationshipType.ClassDependency]: UMLAssociationComponent,
  [UMLRelationshipType.ClassInheritance]: UMLAssociationComponent,
  [UMLRelationshipType.ClassRealization]: UMLAssociationComponent,
  [UMLRelationshipType.ClassUnidirectional]: UMLAssociationComponent,
  [UMLRelationshipType.ObjectLink]: UMLObjectLinkComponent,
  [UMLRelationshipType.ActivityControlFlow]: ActivityControlFlowComponent,
  [UMLRelationshipType.UseCaseAssociation]: UseCaseAssociationComponent,
  [UMLRelationshipType.UseCaseExtend]: UseCaseExtendComponent,
  [UMLRelationshipType.UseCaseGeneralization]: UseCaseGeneralizationComponent,
  [UMLRelationshipType.UseCaseInclude]: UseCaseIncludeComponent,
  [UMLRelationshipType.CommunicationLink]: CommunicationLinkComponent,
  [UMLRelationshipType.ComponentInterfaceProvided]: ComponentInterfaceProvidedComponent,
  [UMLRelationshipType.ComponentInterfaceRequired]: ComponentInterfaceRequiredComponent,
  [UMLRelationshipType.ComponentDependency]: ComponentDependencyComponent,
  [UMLRelationshipType.DeploymentAssociation]: DeploymentAssociationComponent,
};
