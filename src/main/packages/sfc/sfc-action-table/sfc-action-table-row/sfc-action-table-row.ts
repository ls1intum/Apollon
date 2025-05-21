import { UMLElementType } from '../../../uml-element-type';
import { computeDimension, IBoundary } from '../../../../utils/geometry/boundary';
import { SfcElement } from '../../base/SfcElement';

export class SfcActionTableRow extends SfcElement {
  type: UMLElementType = UMLElementType.SfcActionTableRow;
  bounds: IBoundary = { x: 0, y: 0, width: 0, height: computeDimension(1.0, 30) };
}
