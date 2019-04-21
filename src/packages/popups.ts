import { ComponentClass } from 'react';
import { ActivityControlFlowPopup } from './activity-diagram/activity-control-flow/activity-control-flow-popup';
import { ActivityMergeNodePopup } from './activity-diagram/activity-merge-node/activity-merge-node-popup';
import { ClassAssociationPopup } from './class-diagram/class-association/class-association-popup';
import { ClassifierPopup } from './class-diagram/classifier/classifier-popup';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { CommunicationLinkPopup } from './communication-diagram/communication-link/communication-link-popup';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
import { RelationshipType } from './relationship-type';
import { UseCaseAssociationPopup } from './use-case-diagram/use-case-association/use-case-association-popup';
import { UMLElementType } from './uml-element-type';

export type Popups = { [key in UMLElementType | RelationshipType]: ComponentClass<{ element: any }> | null };
export const Popups: { [key in UMLElementType | RelationshipType]: ComponentClass<{ element: any }> | null } = {
  [UMLElementType.Package]: DefaultPopup,
  [UMLElementType.Class]: ClassifierPopup,
  [UMLElementType.AbstractClass]: ClassifierPopup,
  [UMLElementType.Interface]: ClassifierPopup,
  [UMLElementType.Enumeration]: ClassifierPopup,
  [UMLElementType.ClassAttribute]: null,
  [UMLElementType.ClassMethod]: null,
  [UMLElementType.ObjectName]: ObjectNamePopup,
  [UMLElementType.ObjectAttribute]: null,
  [UMLElementType.ObjectMethod]: null,
  [UMLElementType.ActivityActionNode]: DefaultPopup,
  [UMLElementType.ActivityFinalNode]: DefaultPopup,
  [UMLElementType.ActivityForkNode]: DefaultPopup,
  [UMLElementType.ActivityInitialNode]: DefaultPopup,
  [UMLElementType.ActivityMergeNode]: ActivityMergeNodePopup,
  [UMLElementType.ActivityObjectNode]: DefaultPopup,
  [UMLElementType.UseCase]: DefaultPopup,
  [UMLElementType.UseCaseActor]: DefaultPopup,
  [UMLElementType.UseCaseSystem]: DefaultPopup,
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
