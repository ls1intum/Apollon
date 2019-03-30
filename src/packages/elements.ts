import { Diagram } from '../services/diagram/diagram';
import { Element, IElement } from '../services/element/element';
import { UMLElement } from '../typings';
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
import { ElementType } from './element-type';
import { ObjectAttribute } from './object-diagram/object-attribute/object-attribute';
import { ObjectName } from './object-diagram/object-name/object-name';
import { UseCaseActor } from './use-case-diagram/use-case-actor/use-case-actor';
import { UseCaseSystem } from './use-case-diagram/use-case-system/use-case-system';
import { UseCase } from './use-case-diagram/use-case/use-case';

type Elements = { [key in ElementType]: new (values?: IElement | UMLElement) => Element };

export const Elements = {
  [ElementType.Diagram]: Diagram,
  [ElementType.Package]: Package,
  [ElementType.Class]: Class,
  [ElementType.AbstractClass]: AbstractClass,
  [ElementType.Interface]: Interface,
  [ElementType.Enumeration]: Enumeration,
  [ElementType.ClassAttribute]: ClassAttribute,
  [ElementType.ClassMethod]: ClassMethod,
  [ElementType.ObjectName]: ObjectName,
  [ElementType.ObjectAttribute]: ObjectAttribute,
  [ElementType.ActivityInitialNode]: ActivityInitialNode,
  [ElementType.ActivityFinalNode]: ActivityFinalNode,
  [ElementType.ActivityActionNode]: ActivityActionNode,
  [ElementType.ActivityObjectNode]: ActivityObjectNode,
  [ElementType.ActivityForkNode]: ActivityForkNode,
  [ElementType.ActivityMergeNode]: ActivityMergeNode,
  [ElementType.UseCase]: UseCase,
  [ElementType.UseCaseActor]: UseCaseActor,
  [ElementType.UseCaseSystem]: UseCaseSystem,
};
