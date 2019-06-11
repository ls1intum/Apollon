import { UseCaseElementType } from '..';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';

export class UseCaseActor extends UMLElement {
  type = UseCaseElementType.UseCaseActor;

  constructor(values?: IUMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, width: 90, height: 140 } });
    }
  }

  render() {
    return [this];
  }
}
