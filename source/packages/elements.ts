import { ElementType } from './element-type';
import { Element, IElement } from '../services/element/element';
import { UMLElement } from '../typings';
import { Diagram } from '../services/diagram/diagram';
import { Package } from './common/package/package';
import { Class } from './class-diagram/classifier/class/class';
import { AbstractClass } from './class-diagram/classifier/abstract-class/abstract-class';
import { Interface } from './class-diagram/classifier/interface/interface';
import { Enumeration } from './class-diagram/classifier/enumeration/enumeration';
import { ClassAttribute } from './class-diagram/class-member/class-attribute/class-attribute';
import { ClassMethod } from './class-diagram/class-member/class-method/class-method';
// import { ActivityInitialNode } from './ActivityDiagram/ActivityInitialNode';
// import { ActivityFinalNode } from './ActivityDiagram/ActivityFinalNode';
// import { ObjectName } from './ObjectDiagram/ObjectName';
// import { ObjectAttribute } from './ObjectDiagram/ObjectAttribute';
// import { ActivityActionNode } from './ActivityDiagram/ActivityActionNode';
// import { ActivityObjectNode } from './ActivityDiagram/ActivityObjectNode';
// import { ActivityForkNode } from './ActivityDiagram/ActivityForkNode';
// import { ActivityMergeNode } from './ActivityDiagram/ActivityMergeNode';
// import { UseCase } from './UseCaseDiagram/UseCase';
// import { UseCaseActor } from './UseCaseDiagram/UseCaseActor';
// import { UseCaseSystem } from './UseCaseDiagram/UseCaseSystem';

type Elements = {
  [key in ElementType]: new (values?: IElement | UMLElement) => Element;
}

export const Elements = {
  [ElementType.Diagram]: Diagram,
  [ElementType.Package]: Package,
  [ElementType.Class]: Class,
  [ElementType.AbstractClass]: AbstractClass,
  [ElementType.Interface]: Interface,
  [ElementType.Enumeration]: Enumeration,
  [ElementType.ClassAttribute]: ClassAttribute,
  [ElementType.ClassMethod]: ClassMethod,
  // [ElementType.ObjectName]: ObjectName,
  // [ElementType.ObjectAttribute]: ObjectAttribute,
  // [ElementType.ActivityInitialNode]: ActivityInitialNode,
  // [ElementType.ActivityFinalNode]: ActivityFinalNode,
  // [ElementType.ActivityActionNode]: ActivityActionNode,
  // [ElementType.ActivityObjectNode]: ActivityObjectNode,
  // [ElementType.ActivityForkNode]: ActivityForkNode,
  // [ElementType.ActivityMergeNode]: ActivityMergeNode,
  // [ElementType.UseCase]: UseCase,
  // [ElementType.UseCaseActor]: UseCaseActor,
  // [ElementType.UseCaseSystem]: UseCaseSystem,
};
