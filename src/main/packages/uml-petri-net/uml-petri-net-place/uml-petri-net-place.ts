import { PetriNetElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';

export class UMLPetriNetPlace extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };

  type: UMLElementType = PetriNetElementType.PetriNetPlace;
  bounds: IBoundary = { ...this.bounds, width: 60, height: 60 };
  amountOfTokens = 0;

  constructor(values?: DeepPartial<UMLPetriNetPlace>) {
    super(values);
    this.amountOfTokens = (values && values.amountOfTokens) || this.amountOfTokens;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
