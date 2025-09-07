import { PetriNetElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';

export class UMLPetriNetTransition extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = PetriNetElementType.PetriNetTransition;

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds = {
      ...this.bounds,
      height: values?.bounds?.height ?? UMLPetriNetTransition.defaultHeight,
      width: values?.bounds?.width ?? UMLPetriNetTransition.defaultWidth,
    };
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLPetriNetTransition.defaultHeight);
    this.bounds.width = Math.max(this.bounds.width, UMLPetriNetTransition.defaultWidth);
    return [this];
  }
}
