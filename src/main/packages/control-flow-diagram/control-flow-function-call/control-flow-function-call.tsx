import { ControlFlowElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';

export class ControlFlowFunctionCall extends UMLElement {
  type: UMLElementType = ControlFlowElementType.ControlFlowFunctionCall;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
