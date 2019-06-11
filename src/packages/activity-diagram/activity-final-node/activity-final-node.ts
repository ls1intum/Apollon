import { ActivityElementType } from '..';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';

export class ActivityFinalNode extends UMLElement {
  static features = { ...UMLElement.features, editable: false };

  type = ActivityElementType.ActivityFinalNode;

  constructor(values?: IUMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, width: 45, height: 45 } });
    }
  }

  render() {
    return [this];
  }
}
