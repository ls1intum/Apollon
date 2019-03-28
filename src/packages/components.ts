import { FunctionComponent } from 'react';
import { ElementType } from './element-type';
import { RelationshipType } from './relationship-type';

import { PackageComponent } from './common/package/package-component';
import { ClassifierComponent } from './class-diagram/classifier/classifier-component';
import { ClassMemberComponent } from './class-diagram/class-member/class-member-component';
import { ClassAssociationComponent } from './class-diagram/class-association/class-association-component';
import { ObjectLinkComponent } from './object-diagram/object-link/object-link-component';
import { ObjectNameComponent } from './object-diagram/object-name/object-name-component';
import { ObjectAttributeComponent } from './object-diagram/object-attribute/object-attribute-component';
import { ActivityActionNodeComponent } from './activity-diagram/activity-action-node/activity-action-node-component';
import { ActivityFinalNodeComponent } from './activity-diagram/activity-final-node/activity-final-node-component';
import { ActivityForkNodeComponent } from './activity-diagram/activity-fork-node/activity-fork-node-component';
import { ActivityInitialNodeComponent } from './activity-diagram/activity-initial-node/activity-initial-node-component';
import { ActivityMergeNodeComponent } from './activity-diagram/activity-merge-node/activity-merge-node-component';
import { ActivityObjectNodeComponent } from './activity-diagram/activity-object-node/activity-object-node-component';
import { ActivityControlFlowComponent } from './activity-diagram/activity-control-flow/activity-control-flow-component';
// export { UseCaseComponent } from './UseCaseDiagram/UseCase';
// export { UseCaseActorComponent } from './UseCaseDiagram/UseCaseActor';
// export { UseCaseSystemComponent } from './UseCaseDiagram/UseCaseSystem';
// export { UseCaseAssociationComponent } from './UseCaseDiagram/UseCaseAssociation';
// export { UseCaseGeneralizationComponent } from './UseCaseDiagram/UseCaseGeneralization';
// export { UseCaseIncludeComponent } from './UseCaseDiagram/UseCaseInclude';
// export { UseCaseExtendComponent } from './UseCaseDiagram/UseCaseExtend';

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
  [RelationshipType.ClassAggregation]: ClassAssociationComponent,
  [RelationshipType.ClassBidirectional]: ClassAssociationComponent,
  [RelationshipType.ClassComposition]: ClassAssociationComponent,
  [RelationshipType.ClassDependency]: ClassAssociationComponent,
  [RelationshipType.ClassInheritance]: ClassAssociationComponent,
  [RelationshipType.ClassRealization]: ClassAssociationComponent,
  [RelationshipType.ClassUnidirectional]: ClassAssociationComponent,
  [RelationshipType.ObjectLink]: ObjectLinkComponent,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlowComponent,
};
