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
import { ElementType } from './element-type';
import { ObjectAttributeComponent } from './object-diagram/object-attribute/object-attribute-component';
import { ObjectLinkComponent } from './object-diagram/object-link/object-link-component';
import { ObjectNameComponent } from './object-diagram/object-name/object-name-component';
import { RelationshipType } from './relationship-type';
import { UseCaseActorComponent } from './use-case-diagram/use-case-actor/use-case-actor-component';
import { UseCaseAssociationComponent } from './use-case-diagram/use-case-association/use-case-association-component';
import { UseCaseExtendComponent } from './use-case-diagram/use-case-extend/use-case-extend-component';
import { UseCaseGeneralizationComponent } from './use-case-diagram/use-case-generalization/use-case-generalization-component';
import { UseCaseIncludeComponent } from './use-case-diagram/use-case-include/use-case-include-component';
import { UseCaseSystemComponent } from './use-case-diagram/use-case-system/use-case-system-component';
import { UseCaseComponent } from './use-case-diagram/use-case/use-case-component';

export const Components: { [key in ElementType | RelationshipType]: FunctionComponent<{ element: any }> } = {
  [ElementType.Diagram]: PackageComponent,
  [ElementType.Package]: PackageComponent,
  [ElementType.Class]: ClassifierComponent,
  [ElementType.AbstractClass]: ClassifierComponent,
  [ElementType.Interface]: ClassifierComponent,
  [ElementType.Enumeration]: ClassifierComponent,
  [ElementType.ClassAttribute]: ClassMemberComponent,
  [ElementType.ClassMethod]: ClassMemberComponent,
  [ElementType.ObjectName]: ObjectNameComponent,
  [ElementType.ObjectAttribute]: ObjectAttributeComponent,
  [ElementType.ActivityActionNode]: ActivityActionNodeComponent,
  [ElementType.ActivityFinalNode]: ActivityFinalNodeComponent,
  [ElementType.ActivityForkNode]: ActivityForkNodeComponent,
  [ElementType.ActivityInitialNode]: ActivityInitialNodeComponent,
  [ElementType.ActivityMergeNode]: ActivityMergeNodeComponent,
  [ElementType.ActivityObjectNode]: ActivityObjectNodeComponent,
  [ElementType.UseCase]: UseCaseComponent,
  [ElementType.UseCaseActor]: UseCaseActorComponent,
  [ElementType.UseCaseSystem]: UseCaseSystemComponent,
  [RelationshipType.ClassAggregation]: ClassAssociationComponent,
  [RelationshipType.ClassBidirectional]: ClassAssociationComponent,
  [RelationshipType.ClassComposition]: ClassAssociationComponent,
  [RelationshipType.ClassDependency]: ClassAssociationComponent,
  [RelationshipType.ClassInheritance]: ClassAssociationComponent,
  [RelationshipType.ClassRealization]: ClassAssociationComponent,
  [RelationshipType.ClassUnidirectional]: ClassAssociationComponent,
  [RelationshipType.ObjectLink]: ObjectLinkComponent,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlowComponent,
  [RelationshipType.UseCaseAssociation]: UseCaseAssociationComponent,
  [RelationshipType.UseCaseExtend]: UseCaseExtendComponent,
  [RelationshipType.UseCaseGeneralization]: UseCaseGeneralizationComponent,
  [RelationshipType.UseCaseInclude]: UseCaseIncludeComponent,
  [RelationshipType.CommunicationLink]: CommunicationLinkComponent,
};
