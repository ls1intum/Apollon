import { DeepPartial } from 'redux';
import { PetriNetElementType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLPetriNetTransition extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = PetriNetElementType.PetriNetTransition;
  bounds: IBoundary = {
    ...this.bounds,
  };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds.height = (values && values.bounds && values.bounds.height) || UMLPetriNetTransition.defaultHeight;
    this.bounds.width = (values && values.bounds && values.bounds.width) || UMLPetriNetTransition.defaultWidth;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLPetriNetTransition.defaultHeight);
    this.bounds.width = Math.max(this.bounds.width, UMLPetriNetTransition.defaultWidth);
    return [this];
  }
}
