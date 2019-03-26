import { ElementType as CommonElementType } from './Common';
import { ElementType as ClassElementType } from './ClassDiagram';
import { ElementType as ObjectElementType } from './ObjectDiagram';
import { ElementType as ActivityElementType } from './ActivityDiagram';
import { ElementType as UseCaseElementType } from './UseCaseDiagram';

export type ElementType =
  | CommonElementType
  | ClassElementType
  | ObjectElementType
  | ActivityElementType
  | UseCaseElementType;

export const ElementType = {
  ...CommonElementType,
  ...ClassElementType,
  ...ObjectElementType,
  ...ActivityElementType,
  ...UseCaseElementType,
};
