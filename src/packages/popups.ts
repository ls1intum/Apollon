import { ComponentClass } from 'react';
import { ElementType } from './element-type';
import { RelationshipType } from './relationship-type';

import { DefaultPopup } from './common/default-popup';
import { ClassifierPopup } from './class-diagram/classifier/classifier-popup';
import { ClassAssociationPopup } from './class-diagram/class-association/class-association-popup';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
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
  [ElementType.ActivityActionNode]: DefaultPopup,
  [ElementType.ActivityFinalNode]: DefaultPopup,
  [ElementType.ActivityForkNode]: DefaultPopup,
  [ElementType.ActivityInitialNode]: DefaultPopup,
  [ElementType.ActivityMergeNode]: DefaultPopup,
  [ElementType.ActivityObjectNode]: DefaultPopup,
  [RelationshipType.ClassAggregation]: ClassAssociationPopup,
  [RelationshipType.ClassBidirectional]: ClassAssociationPopup,
  [RelationshipType.ClassComposition]: ClassAssociationPopup,
  [RelationshipType.ClassDependency]: ClassAssociationPopup,
  [RelationshipType.ClassInheritance]: ClassAssociationPopup,
  [RelationshipType.ClassRealization]: ClassAssociationPopup,
  [RelationshipType.ClassUnidirectional]: ClassAssociationPopup,
  [RelationshipType.ObjectLink]: null,
  [RelationshipType.ActivityControlFlow]: null,
};
