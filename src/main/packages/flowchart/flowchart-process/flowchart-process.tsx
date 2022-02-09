import { FlowchartElementType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementType } from '../../uml-element-type.js';

export class FlowchartProcess extends UMLElement {
  type: UMLElementType = FlowchartElementType.FlowchartProcess;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
