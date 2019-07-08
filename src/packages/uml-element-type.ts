import { CommonElementType } from './common';
import { ActivityElementType } from './uml-activity-diagram';
import { ClassElementType } from './uml-class-diagram';
import { ComponentElementType } from './uml-component-diagram';
import { DeploymentElementType } from './uml-deployment-diagram';
import { ObjectElementType } from './uml-object-diagram';
import { UseCaseElementType } from './uml-use-case-diagram';

export type UMLElementType =
  | CommonElementType
  | ClassElementType
  | ObjectElementType
  | ActivityElementType
  | UseCaseElementType
  | ComponentElementType
  | DeploymentElementType;

export const UMLElementType = {
  ...CommonElementType,
  ...ClassElementType,
  ...ObjectElementType,
  ...ActivityElementType,
  ...UseCaseElementType,
  ...ComponentElementType,
  ...DeploymentElementType,
};
