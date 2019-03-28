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
// export { ActivityActionNodeComponent } from './ActivityDiagram/ActivityActionNode';
// export { ActivityFinalNodeComponent } from './ActivityDiagram/ActivityFinalNode';
// export { ActivityForkNodeComponent } from './ActivityDiagram/ActivityForkNode';
// export { ActivityInitialNodeComponent } from './ActivityDiagram/ActivityInitialNode';
// export { ActivityMergeNodeComponent } from './ActivityDiagram/ActivityMergeNode';
// export { ActivityObjectNodeComponent } from './ActivityDiagram/ActivityObjectNode';
// export { ActivityControlFlowComponent } from './ActivityDiagram/ActivityControlFlow';
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
  [RelationshipType.ClassAggregation]: ClassAssociationComponent,
  [RelationshipType.ClassBidirectional]: ClassAssociationComponent,
  [RelationshipType.ClassComposition]: ClassAssociationComponent,
  [RelationshipType.ClassDependency]: ClassAssociationComponent,
  [RelationshipType.ClassInheritance]: ClassAssociationComponent,
  [RelationshipType.ClassRealization]: ClassAssociationComponent,
  [RelationshipType.ClassUnidirectional]: ClassAssociationComponent,
  [RelationshipType.ObjectLink]: ObjectLinkComponent,
};
