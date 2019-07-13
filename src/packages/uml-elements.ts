import { IUMLElement, UMLElement } from '../services/uml-element/uml-element';
import { UMLActivityActionNode } from './uml-activity-diagram/uml-activity-action-node/uml-activity-action-node';
import { UMLActivityFinalNode } from './uml-activity-diagram/uml-activity-final-node/uml-activity-final-node';
import { UMLActivityForkNode } from './uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node';
import { UMLActivityInitialNode } from './uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node';
import { UMLActivityMergeNode } from './uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node';
import { UMLActivityObjectNode } from './uml-activity-diagram/uml-activity-object-node/uml-activity-object-node';
import { UMLActivity } from './uml-activity-diagram/uml-activity/uml-activity';
import { UMLAbstractClass } from './uml-class-diagram/uml-abstract-class/uml-abstract-class';
import { UMLClassAttribute } from './uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from './uml-class-diagram/uml-class-method/uml-class-method';
import { UMLClassPackage } from './uml-class-diagram/uml-class-package/uml-class-package';
import { UMLClass } from './uml-class-diagram/uml-class/uml-class';
import { UMLEnumeration } from './uml-class-diagram/uml-enumeration/uml-enumeration';
import { UMLInterface } from './uml-class-diagram/uml-interface/uml-interface';
import { UMLComponentInterface } from './uml-component-diagram/uml-component-interface/uml-component-interface';
import { UMLComponent } from './uml-component-diagram/uml-component/uml-component';
import { UMLDeploymentArtifact } from './uml-deployment-diagram/uml-deployment-artifact/uml-deployment-artifact';
import { UMLDeploymentNode } from './uml-deployment-diagram/uml-deployment-node/uml-deployment-node';
import { UMLElementType } from './uml-element-type';
import { UMLObjectAttribute } from './uml-object-diagram/uml-object-attribute/uml-object-attribute';
import { UMLObjectMethod } from './uml-object-diagram/uml-object-method/uml-object-method';
import { UMLObjectName } from './uml-object-diagram/uml-object-name/uml-object-name';
import { UMLUseCaseActor } from './uml-use-case-diagram/uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseSystem } from './uml-use-case-diagram/uml-use-case-system/uml-use-case-system';
import { UMLUseCase } from './uml-use-case-diagram/uml-use-case/uml-use-case';

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
  [UMLElementType.Activity]: UMLActivity,
  [UMLElementType.ActivityInitialNode]: UMLActivityInitialNode,
  [UMLElementType.ActivityFinalNode]: UMLActivityFinalNode,
  [UMLElementType.ActivityActionNode]: UMLActivityActionNode,
  [UMLElementType.ActivityObjectNode]: UMLActivityObjectNode,
  [UMLElementType.ActivityForkNode]: UMLActivityForkNode,
  [UMLElementType.ActivityMergeNode]: UMLActivityMergeNode,
  [UMLElementType.UseCase]: UMLUseCase,
  [UMLElementType.UseCaseActor]: UMLUseCaseActor,
  [UMLElementType.UseCaseSystem]: UMLUseCaseSystem,
  [UMLElementType.Component]: UMLComponent,
  [UMLElementType.ComponentInterface]: UMLComponentInterface,
  [UMLElementType.DeploymentNode]: UMLDeploymentNode,
  [UMLElementType.DeploymentArtifact]: UMLDeploymentArtifact,
};
