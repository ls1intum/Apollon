import { ActivityElementType } from './activity-diagram';
import { ClassElementType } from './class-diagram';
import { CommonElementType } from './common';
import { ComponentElementType } from './component-diagram';
import { DeploymentElementType } from './deployment-diagram';
import { ObjectElementType } from './object-diagram';
import { UseCaseElementType } from './use-case-diagram';

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
