import { CommonElementType } from './common';
import { ClassElementType } from './class-diagram';
import { ObjectElementType } from './object-diagram';
// import { ElementType as ActivityElementType } from './ActivityDiagram';
// import { ElementType as UseCaseElementType } from './UseCaseDiagram';

export type ElementType =
  | CommonElementType
  | ClassElementType
  | ObjectElementType
  // | ActivityElementType
  // | UseCaseElementType;

export const ElementType = {
  ...CommonElementType,
  ...ClassElementType,
  ...ObjectElementType,
  // ...ActivityElementType,
  // ...UseCaseElementType,
};
