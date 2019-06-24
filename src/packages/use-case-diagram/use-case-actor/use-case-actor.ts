import { UseCaseElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';

export class UseCaseActor extends UMLElement {
  type: UMLElementType = UseCaseElementType.UseCaseActor;
  bounds: IBoundary = { ...this.bounds, width: 90, height: 140 };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
