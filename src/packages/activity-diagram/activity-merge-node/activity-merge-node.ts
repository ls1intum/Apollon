import { ActivityElementType } from '..';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';

export class ActivityMergeNode extends UMLElement {
  type = ActivityElementType.ActivityMergeNode;

  constructor(values?: IUMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, height: 60 } });
    }
  }
}
