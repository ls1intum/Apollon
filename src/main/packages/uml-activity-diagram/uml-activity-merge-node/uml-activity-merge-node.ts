import { ActivityElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';

export class UMLActivityMergeNode extends UMLElement {
  type: UMLElementType = ActivityElementType.ActivityMergeNode;
  bounds: IBoundary = { ...this.bounds };

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
