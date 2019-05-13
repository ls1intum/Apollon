import { ComponentElementType } from '..';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';

export class ComponentInterface extends Element {
  static features = { ...Element.features, resizable: 'NONE' as 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE' };

  type = ComponentElementType.ComponentInterface;

  constructor(values?: IElement);
  constructor(values?: UMLElement);
  constructor(values?: IElement | UMLElement);
  constructor(values?: IElement | UMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, width: 45, height: 45 } });
    }
  }
}
