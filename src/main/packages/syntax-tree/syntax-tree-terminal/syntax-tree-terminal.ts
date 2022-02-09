import { SyntaxTreeElementType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementType } from '../../uml-element-type.js';

export class SyntaxTreeTerminal extends UMLElement {
  type: UMLElementType = SyntaxTreeElementType.SyntaxTreeTerminal;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
