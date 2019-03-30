import { ActivityElementType } from './activity-diagram';
import { ClassElementType } from './class-diagram';
import { CommonElementType } from './common';
import { ObjectElementType } from './object-diagram';
import { UseCaseElementType } from './use-case-diagram';

export type ElementType = CommonElementType | ClassElementType | ObjectElementType | ActivityElementType | UseCaseElementType;

export const ElementType = {
  ...CommonElementType,
  ...ClassElementType,
  ...ObjectElementType,
  ...ActivityElementType,
  ...UseCaseElementType,
};
