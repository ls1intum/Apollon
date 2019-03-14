import { ElementKind as ClassElementKind } from './ClassDiagram';
import { ElementKind as UseCaseElementKind } from './UseCaseDiagram';

type ElementKind = ClassElementKind | UseCaseElementKind;
const ElementKind = {
  ...ClassElementKind,
  ...UseCaseElementKind,
};

export default ElementKind;
