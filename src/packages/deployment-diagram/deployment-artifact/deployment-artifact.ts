import { DeploymentElementType } from '..';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';

export class DeploymentArtifact extends Element {
  type = DeploymentElementType.DeploymentArtifact;

  constructor(values?: IElement);
  constructor(values?: UMLElement);
  constructor(values?: IElement | UMLElement);
  constructor(values?: IElement | UMLElement) {
    super(values);

    if (!values) {
      Object.assign(this, { bounds: { ...this.bounds, height: 40 } });
    }
  }
}
