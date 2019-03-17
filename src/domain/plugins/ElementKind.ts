import { ElementKind as CommonElementKind } from './Common';
import { ElementKind as ClassElementKind } from './ClassDiagram';
import { ElementKind as UseCaseElementKind } from './UseCaseDiagram';

type ElementKind = CommonElementKind | ClassElementKind | UseCaseElementKind;

const ElementKind = {
  ...CommonElementKind,
  ...ClassElementKind,
  ...UseCaseElementKind,
};

export default ElementKind;
