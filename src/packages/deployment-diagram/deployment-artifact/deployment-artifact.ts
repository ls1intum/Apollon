import { DeepPartial } from 'redux';
import { DeploymentElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { assign } from '../../../utils/fx/assign';

export class DeploymentArtifact extends UMLElement {
  type = DeploymentElementType.DeploymentArtifact;

  constructor(values?: DeepPartial<IUMLElement>) {
    super();
    assign<IUMLElement>(this, { ...values, bounds: { ...this.bounds, height: 40 } });
  }

  render(layer: ILayer): ILayoutable[] {
    return [this];
  }
}
