import { ElementKind as CommonElementKind } from './Common';
import { ElementKind as ClassElementKind } from './ClassDiagram';
import { ElementKind as ObjectElementKind } from './ObjectDiagram';
import { ElementKind as ActivityElementKind } from './ActivityDiagram';
import { ElementKind as UseCaseElementKind } from './UseCaseDiagram';

type ElementKind =
  | CommonElementKind
  | ClassElementKind
  | ObjectElementKind
  | ActivityElementKind
  | UseCaseElementKind;

const ElementKind = {
  ...CommonElementKind,
  ...ClassElementKind,
  ...ObjectElementKind,
  ...ActivityElementKind,
  ...UseCaseElementKind,
};

export default ElementKind;
