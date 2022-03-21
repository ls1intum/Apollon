import { SyntaxTreeElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';

export class SyntaxTreeTerminal extends UMLElement {
  type: UMLElementType = SyntaxTreeElementType.SyntaxTreeTerminal;

  render(canvas: ILayer): ILayoutable[] {
    const namedBounds = calculateNameBounds(this, canvas);
    this.bounds = namedBounds;
    return [this];
  }
}
