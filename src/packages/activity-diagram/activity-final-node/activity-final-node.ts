import { ActivityElementType } from '..';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';

export class ActivityFinalNode extends Element {
  static features = { ...Element.features, editable: false };

  type = ActivityElementType.ActivityFinalNode;

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
