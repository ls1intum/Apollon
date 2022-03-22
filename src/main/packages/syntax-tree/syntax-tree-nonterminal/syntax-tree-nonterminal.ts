import { SyntaxTreeElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';

export class SyntaxTreeNonterminal extends UMLElement {
  type: UMLElementType = SyntaxTreeElementType.SyntaxTreeNonterminal;

  render(canvas: ILayer): ILayoutable[] {
    this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
}
