import { ComponentClass } from 'react';
import { ActivityControlFlowPopup } from './activity-diagram/activity-control-flow/activity-control-flow-popup';
import { ActivityMergeNodePopup } from './activity-diagram/activity-merge-node/activity-merge-node-popup';
import { ClassAssociationPopup } from './class-diagram/class-association/class-association-popup';
import { ClassifierPopup } from './class-diagram/classifier/classifier-popup';
import { DefaultPopup } from './common/default-popup';
import { DefaultRelationshipPopup } from './common/default-relationship-popup';
import { CommunicationLinkPopup } from './communication-diagram/communication-link/communication-link-popup';
import { ObjectNamePopup } from './object-diagram/object-name/object-name-popup';
import { UMLElementType } from './uml-element-type';
import { UMLRelationshipType } from './uml-relationship-type';
import { UseCaseAssociationPopup } from './use-case-diagram/use-case-association/use-case-association-popup';

export type Popups = { [key in UMLElementType | UMLRelationshipType]: ComponentClass<{ element: any }> | null };
export const Popups: { [key in UMLElementType | UMLRelationshipType]: ComponentClass<{ element: any }> | null } = {
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
  [UMLRelationshipType.ClassAggregation]: ClassAssociationPopup,
  [UMLRelationshipType.ClassBidirectional]: ClassAssociationPopup,
  [UMLRelationshipType.ClassComposition]: ClassAssociationPopup,
  [UMLRelationshipType.ClassDependency]: ClassAssociationPopup,
  [UMLRelationshipType.ClassInheritance]: ClassAssociationPopup,
  [UMLRelationshipType.ClassRealization]: ClassAssociationPopup,
  [UMLRelationshipType.ClassUnidirectional]: ClassAssociationPopup,
  [UMLRelationshipType.ObjectLink]: DefaultRelationshipPopup,
  [UMLRelationshipType.ActivityControlFlow]: ActivityControlFlowPopup,
  [UMLRelationshipType.UseCaseAssociation]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseExtend]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseGeneralization]: UseCaseAssociationPopup,
  [UMLRelationshipType.UseCaseInclude]: UseCaseAssociationPopup,
  [UMLRelationshipType.CommunicationLink]: CommunicationLinkPopup,
};
