import { ElementKind as CommonElementKind } from './Common';
import { ElementKind as ClassElementKind } from './ClassDiagram';
import { ElementKind as ActivityElementKind } from './ActivityDiagram';
import { ElementKind as UseCaseElementKind } from './UseCaseDiagram';

type ElementKind =
  | CommonElementKind
  | ClassElementKind
  | ActivityElementKind
  | UseCaseElementKind;

const ElementKind = {
  ...CommonElementKind,
  ...ClassElementKind,
  ...ActivityElementKind,
  ...UseCaseElementKind,
};

export default ElementKind;
