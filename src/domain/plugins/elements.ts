import ElementKind from './ElementKind';
import Element, { IElement } from './../Element';
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
import Diagram from '../Diagram/Diagram';
import { Package } from './Common/Package';
import { ClassAttribute } from './ClassDiagram/ClassMember/ClassAttribute';
import { ClassMethod } from './ClassDiagram/ClassMember/ClassMethod';

export const elements: { [key in ElementKind]: new (values?: Partial<IElement>) => Element } = {
  [ElementKind.Diagram]: Diagram,
  [ElementKind.Package]: Package,
  [ElementKind.Class]: Class,
  [ElementKind.AbstractClass]: AbstractClass,
  [ElementKind.Interface]: Interface,
  [ElementKind.Enumeration]: Enumeration,
  [ElementKind.ClassAttribute]: ClassAttribute,
  [ElementKind.ClassMethod]: ClassMethod,
  [ElementKind.ObjectName]: ObjectName,
  [ElementKind.ObjectAttribute]: ObjectAttribute,
  [ElementKind.ActivityInitialNode]: ActivityInitialNode,
  [ElementKind.ActivityFinalNode]: ActivityFinalNode,
  [ElementKind.ActivityActionNode]: ActivityActionNode,
  [ElementKind.ActivityObjectNode]: ActivityObjectNode,
  [ElementKind.ActivityForkNode]: ActivityForkNode,
  [ElementKind.ActivityMergeNode]: ActivityMergeNode,
  [ElementKind.UseCase]: UseCase,
  [ElementKind.UseCaseActor]: UseCaseActor,
  [ElementKind.UseCaseSystem]: UseCaseSystem,
}