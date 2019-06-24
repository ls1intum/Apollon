import { IUMLElement, UMLElement } from '../services/uml-element/uml-element';
import { ActivityActionNode } from './activity-diagram/activity-action-node/activity-action-node';
import { ActivityFinalNode } from './activity-diagram/activity-final-node/activity-final-node';
import { ActivityForkNode } from './activity-diagram/activity-fork-node/activity-fork-node';
import { ActivityInitialNode } from './activity-diagram/activity-initial-node/activity-initial-node';
import { ActivityMergeNode } from './activity-diagram/activity-merge-node/activity-merge-node';
import { ActivityObjectNode } from './activity-diagram/activity-object-node/activity-object-node';
import { ClassAttribute } from './class-diagram/class-member/class-attribute/class-attribute';
import { ClassMethod } from './class-diagram/class-member/class-method/class-method';
import { AbstractClass } from './class-diagram/classifier/abstract-class/abstract-class';
import { Class } from './class-diagram/classifier/class/class';
import { Enumeration } from './class-diagram/classifier/enumeration/enumeration';
import { Interface } from './class-diagram/classifier/interface/interface';
import { Package } from './common/package/package';
import { ComponentInterface } from './component-diagram/component-interface/component-interface';
import { Component } from './component-diagram/component/component';
import { DeploymentArtifact } from './deployment-diagram/deployment-artifact/deployment-artifact';
import { DeploymentNode } from './deployment-diagram/deployment-node/deployment-node';
import { ObjectAttribute } from './object-diagram/object-member/object-attribute/object-attribute';
import { ObjectMethod } from './object-diagram/object-member/object-method/object-method';
import { ObjectName } from './object-diagram/object-name/object-name';
import { UMLElementType } from './uml-element-type';
import { UseCaseActor } from './use-case-diagram/use-case-actor/use-case-actor';
import { UseCaseSystem } from './use-case-diagram/use-case-system/use-case-system';
import { UseCase } from './use-case-diagram/use-case/use-case';

type UMLElements = { [key in UMLElementType]: new (values: IUMLElement) => UMLElement };

export const UMLElements = {
  [UMLElementType.Package]: Package,
  [UMLElementType.Class]: Class,
  [UMLElementType.AbstractClass]: AbstractClass,
  [UMLElementType.Interface]: Interface,
  [UMLElementType.Enumeration]: Enumeration,
  [UMLElementType.ClassAttribute]: ClassAttribute,
  [UMLElementType.ClassMethod]: ClassMethod,
  [UMLElementType.ObjectName]: ObjectName,
  [UMLElementType.ObjectAttribute]: ObjectAttribute,
  [UMLElementType.ObjectMethod]: ObjectMethod,
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
