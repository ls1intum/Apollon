import { FunctionComponent } from 'react';
import { ActivityActionNodeComponent } from './activity-diagram/activity-action-node/activity-action-node-component';
import { ActivityControlFlowComponent } from './activity-diagram/activity-control-flow/activity-control-flow-component';
import { ActivityFinalNodeComponent } from './activity-diagram/activity-final-node/activity-final-node-component';
import { ActivityForkNodeComponent } from './activity-diagram/activity-fork-node/activity-fork-node-component';
import { ActivityInitialNodeComponent } from './activity-diagram/activity-initial-node/activity-initial-node-component';
import { ActivityMergeNodeComponent } from './activity-diagram/activity-merge-node/activity-merge-node-component';
import { ActivityObjectNodeComponent } from './activity-diagram/activity-object-node/activity-object-node-component';
import { ClassAssociationComponent } from './class-diagram/class-association/class-association-component';
import { ClassMemberComponent } from './class-diagram/class-member/class-member-component';
import { ClassifierComponent } from './class-diagram/classifier/classifier-component';
import { PackageComponent } from './common/package/package-component';
import { CommunicationLinkComponent } from './communication-diagram/communication-link/communication-link-component';
import { ComponentDependencyComponent } from './component-diagram/component-dependency/component-dependency-component';
import { ComponentInterfaceProvidedComponent } from './component-diagram/component-interface-provided/component-interface-provided-component';
import { ComponentInterfaceRequiredComponent } from './component-diagram/component-interface-required/component-interface-required-component';
import { ComponentInterfaceComponent } from './component-diagram/component-interface/component-interface-component';
import { ComponentComponent } from './component-diagram/component/component-component';
import { DeploymentArtifactComponent } from './deployment-diagram/deployment-artifact/deployment-artifact-component';
import { DeploymentAssociationComponent } from './deployment-diagram/deployment-association/deployment-association-component';
import { DeploymentNodeComponent } from './deployment-diagram/deployment-node/deployment-node-component';
import { ObjectLinkComponent } from './object-diagram/object-link/object-link-component';
import { ObjectMemberComponent } from './object-diagram/object-member/object-member-component';
import { ObjectNameComponent } from './object-diagram/object-name/object-name-component';
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
  [UMLElementType.Package]: PackageComponent,
  [UMLElementType.Class]: ClassifierComponent,
  [UMLElementType.AbstractClass]: ClassifierComponent,
  [UMLElementType.Interface]: ClassifierComponent,
  [UMLElementType.Enumeration]: ClassifierComponent,
  [UMLElementType.ClassAttribute]: ClassMemberComponent,
  [UMLElementType.ClassMethod]: ClassMemberComponent,
  [UMLElementType.ObjectName]: ObjectNameComponent,
  [UMLElementType.ObjectAttribute]: ObjectMemberComponent,
  [UMLElementType.ObjectMethod]: ObjectMemberComponent,
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
  [UMLRelationshipType.ClassAggregation]: ClassAssociationComponent,
  [UMLRelationshipType.ClassBidirectional]: ClassAssociationComponent,
  [UMLRelationshipType.ClassComposition]: ClassAssociationComponent,
  [UMLRelationshipType.ClassDependency]: ClassAssociationComponent,
  [UMLRelationshipType.ClassInheritance]: ClassAssociationComponent,
  [UMLRelationshipType.ClassRealization]: ClassAssociationComponent,
  [UMLRelationshipType.ClassUnidirectional]: ClassAssociationComponent,
  [UMLRelationshipType.ObjectLink]: ObjectLinkComponent,
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
