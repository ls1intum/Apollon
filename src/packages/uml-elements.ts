import { IUMLElement, UMLElement } from '../services/uml-element/uml-element';
import { ActivityActionNode } from './activity-diagram/activity-action-node/activity-action-node';
import { ActivityFinalNode } from './activity-diagram/activity-final-node/activity-final-node';
import { ActivityForkNode } from './activity-diagram/activity-fork-node/activity-fork-node';
import { ActivityInitialNode } from './activity-diagram/activity-initial-node/activity-initial-node';
import { ActivityMergeNode } from './activity-diagram/activity-merge-node/activity-merge-node';
import { ActivityObjectNode } from './activity-diagram/activity-object-node/activity-object-node';
import { UMLAbstractClass } from './class-diagram/uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './class-diagram/uml-class-method/uml-class-method';
import { UMLClassPackage } from './class-diagram/uml-class-package/uml-class-package';
import { UMLClass } from './class-diagram/uml-class/uml-class';
import { UMLEnumeration } from './class-diagram/uml-enumeration/uml-enumeration';
import { UMLInterface } from './class-diagram/uml-interface/uml-interface';
import { ComponentInterface } from './component-diagram/component-interface/component-interface';
import { Component } from './component-diagram/component/component';
import { DeploymentArtifact } from './deployment-diagram/deployment-artifact/deployment-artifact';
import { DeploymentNode } from './deployment-diagram/deployment-node/deployment-node';
import { UMLObjectAttribute } from './object-diagram/uml-object-attribute/uml-object-attribute';
import { UMLObjectMethod } from './object-diagram/uml-object-method/uml-object-method';
import { UMLObjectName } from './object-diagram/uml-object-name/uml-object-name';
import { UMLElementType } from './uml-element-type';
import { UseCaseActor } from './use-case-diagram/use-case-actor/use-case-actor';
import { UseCaseSystem } from './use-case-diagram/use-case-system/use-case-system';
import { UseCase } from './use-case-diagram/use-case/use-case';

type UMLElements = { [key in UMLElementType]: new (values: IUMLElement) => UMLElement };

export const UMLElements = {
  [UMLElementType.Package]: UMLClassPackage,
  [UMLElementType.Class]: UMLClass,
  [UMLElementType.AbstractClass]: UMLAbstractClass,
  [UMLElementType.Interface]: UMLInterface,
  [UMLElementType.Enumeration]: UMLEnumeration,
  [UMLElementType.ClassAttribute]: UMLClassAttribute,
  [UMLElementType.ClassMethod]: UMLClassMethod,
  [UMLElementType.ObjectName]: UMLObjectName,
  [UMLElementType.ObjectAttribute]: UMLObjectAttribute,
  [UMLElementType.ObjectMethod]: UMLObjectMethod,
  [UMLElementType.ActivityInitialNode]: ActivityInitialNode,
  [UMLElementType.ActivityFinalNode]: ActivityFinalNode,
  [UMLElementType.ActivityActionNode]: ActivityActionNode,
  [UMLElementType.ActivityObjectNode]: ActivityObjectNode,
  [UMLElementType.ActivityForkNode]: ActivityForkNode,
  [UMLElementType.ActivityMergeNode]: ActivityMergeNode,
  [UMLElementType.UseCase]: UseCase,
  [UMLElementType.UseCaseActor]: UseCaseActor,
  [UMLElementType.UseCaseSystem]: UseCaseSystem,
  [UMLElementType.Component]: Component,
  [UMLElementType.ComponentInterface]: ComponentInterface,
  [UMLElementType.DeploymentNode]: DeploymentNode,
  [UMLElementType.DeploymentArtifact]: DeploymentArtifact,
};
