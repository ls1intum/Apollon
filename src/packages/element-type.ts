import { ActivityElementType } from './activity-diagram';
import { ClassElementType } from './class-diagram';
import { CommonElementType } from './common';
import { ComponentElementType } from './component-diagram';
import { ObjectElementType } from './object-diagram';
import { UseCaseElementType } from './use-case-diagram';

export type ElementType =
  | CommonElementType
  | ClassElementType
  | ObjectElementType
  | ActivityElementType
  | UseCaseElementType
  | ComponentElementType;

export const ElementType = {
  ...CommonElementType,
  ...ClassElementType,
  ...ObjectElementType,
  ...ActivityElementType,
  ...UseCaseElementType,
  ...ComponentElementType,
};
