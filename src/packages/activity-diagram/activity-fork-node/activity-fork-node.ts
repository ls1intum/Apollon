import { ActivityElementType } from '..';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';

export class ActivityForkNode extends UMLElement {
  static features = { ...UMLElement.features, editable: false };

  type = ActivityElementType.ActivityForkNode;

  constructor(values?: IUMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, width: 20, height: 60 } });
    }
  }
}
