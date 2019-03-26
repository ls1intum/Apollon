import { ElementType } from './element-type';
import { Element, IElement } from '../../services/element';
import { UMLElement } from '../..';
import { Class } from './ClassDiagram/Classifier/Class';
import { AbstractClass } from './ClassDiagram/Classifier/AbstractClass';
import { Interface } from './ClassDiagram/Classifier/Interface';
import { Enumeration } from './ClassDiagram/Classifier/Enumeration';
import { ActivityInitialNode } from './ActivityDiagram/ActivityInitialNode';
import { ActivityFinalNode } from './ActivityDiagram/ActivityFinalNode';
import { ObjectName } from './ObjectDiagram/ObjectName';
import { ObjectAttribute } from './ObjectDiagram/ObjectAttribute';
import { ActivityActionNode } from './ActivityDiagram/ActivityActionNode';
import { ActivityObjectNode } from './ActivityDiagram/ActivityObjectNode';
import { ActivityForkNode } from './ActivityDiagram/ActivityForkNode';
import { ActivityMergeNode } from './ActivityDiagram/ActivityMergeNode';
import { UseCase } from './UseCaseDiagram/UseCase';
import { UseCaseActor } from './UseCaseDiagram/UseCaseActor';
import { UseCaseSystem } from './UseCaseDiagram/UseCaseSystem';
import { Diagram } from '../Diagram/Diagram';
import { Package } from './Common/Package';
import { ClassAttribute } from './ClassDiagram/ClassMember/ClassAttribute';
import { ClassMethod } from './ClassDiagram/ClassMember/ClassMethod';

export const elements: { [key in ElementType]: new (values?: IElement | UMLElement) => Element } = {
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
}