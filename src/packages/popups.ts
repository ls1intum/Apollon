import { ComponentClass } from 'react';
import { ActivityControlFlowPopup } from './activity-diagram/activity-control-flow/activity-control-flow-popup';
import { ActivityMergeNodePopup } from './activity-diagram/activity-merge-node/activity-merge-node-popup';
import { ClassAssociationPopup } from './class-diagram/class-association/class-association-popup';
import { ClassifierPopup } from './class-diagram/classifier/classifier-popup';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { CommunicationLinkPopup } from './communication-diagram/communication-link/communication-link-popup';
import { ElementType } from './element-type';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
import { RelationshipType } from './relationship-type';
import { UseCaseAssociationPopup } from './use-case-diagram/use-case-association/use-case-association-popup';

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
  [ElementType.ObjectMethod]: null,
  [ElementType.ActivityActionNode]: DefaultPopup,
  [ElementType.ActivityFinalNode]: DefaultPopup,
  [ElementType.ActivityForkNode]: DefaultPopup,
  [ElementType.ActivityInitialNode]: DefaultPopup,
  [ElementType.ActivityMergeNode]: ActivityMergeNodePopup,
  [ElementType.ActivityObjectNode]: DefaultPopup,
  [ElementType.UseCase]: DefaultPopup,
  [ElementType.UseCaseActor]: DefaultPopup,
  [ElementType.UseCaseSystem]: DefaultPopup,
  [RelationshipType.ClassAggregation]: ClassAssociationPopup,
  [RelationshipType.ClassBidirectional]: ClassAssociationPopup,
  [RelationshipType.ClassComposition]: ClassAssociationPopup,
  [RelationshipType.ClassDependency]: ClassAssociationPopup,
  [RelationshipType.ClassInheritance]: ClassAssociationPopup,
  [RelationshipType.ClassRealization]: ClassAssociationPopup,
  [RelationshipType.ClassUnidirectional]: ClassAssociationPopup,
  [RelationshipType.ObjectLink]: DefaultRelationshipPopup,
  [RelationshipType.ActivityControlFlow]: ActivityControlFlowPopup,
  [RelationshipType.UseCaseAssociation]: UseCaseAssociationPopup,
  [RelationshipType.UseCaseExtend]: UseCaseAssociationPopup,
  [RelationshipType.UseCaseGeneralization]: UseCaseAssociationPopup,
  [RelationshipType.UseCaseInclude]: UseCaseAssociationPopup,
  [RelationshipType.CommunicationLink]: CommunicationLinkPopup,
};
