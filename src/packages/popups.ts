import { ComponentClass } from 'react';
import { ElementType } from './element-type';
import { RelationshipType } from './relationship-type';

import { DefaultPopup } from './common/default-popup';
import { ClassifierPopup } from './class-diagram/classifier/classifier-popup';
import { ClassAssociationPopup } from './class-diagram/class-association/class-association-popup';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
// export { ObjectAttributeComponent } from './ObjectDiagram/ObjectAttribute';
// export { ObjectLinkComponent } from './ObjectDiagram/ObjectLink';
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

export type Popups = { [key in ElementType | RelationshipType]: ComponentClass<{ element: any }> | null };
export const Popups: { [key in ElementType | RelationshipType]: ComponentClass<{ element: any }> | null } = {
  [ElementType.Diagram]: DefaultPopup,
  [ElementType.Package]: DefaultPopup,
  [ElementType.Class]: ClassifierPopup,
  [ElementType.AbstractClass]: ClassifierPopup,
  [ElementType.Interface]: ClassifierPopup,
  [ElementType.Enumeration]: ClassifierPopup,
  [ElementType.ClassAttribute]: null,
  [ElementType.ClassMethod]: null,
  [ElementType.ObjectName]: ObjectNamePopup,
  [ElementType.ObjectAttribute]: null,
  [RelationshipType.ClassAggregation]: ClassAssociationPopup,
  [RelationshipType.ClassBidirectional]: ClassAssociationPopup,
  [RelationshipType.ClassComposition]: ClassAssociationPopup,
  [RelationshipType.ClassDependency]: ClassAssociationPopup,
  [RelationshipType.ClassInheritance]: ClassAssociationPopup,
  [RelationshipType.ClassRealization]: ClassAssociationPopup,
  [RelationshipType.ClassUnidirectional]: ClassAssociationPopup,
  [RelationshipType.ObjectLink]: null,
};
