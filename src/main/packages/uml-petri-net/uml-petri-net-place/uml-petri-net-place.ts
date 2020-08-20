import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';
import * as Apollon from '../../../typings';
import { PetriNetElementType } from '../index';

export class UMLPetriNetPlace extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };
  static defaultCapacity = 1;

  type: UMLElementType = PetriNetElementType.PetriNetPlace;
  bounds: IBoundary = { ...this.bounds, width: 60, height: 60 };
  amountOfTokens = 0;
  capacity = UMLPetriNetPlace.defaultCapacity;

  constructor(values?: DeepPartial<UMLPetriNetPlace>) {
    super(values);
    this.amountOfTokens = (values && values.amountOfTokens) || this.amountOfTokens;
    this.capacity = (values && values.capacity) || this.capacity;
  }

  serialize(children?: UMLElement[]): Apollon.UMLPetriNetPlace {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof PetriNetElementType,
      amountOfTokens: this.amountOfTokens,
      capacity: this.capacity,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLPetriNetPlace =>
      v.type === PetriNetElementType.PetriNetPlace;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.amountOfTokens = values.amountOfTokens;
    this.capacity = values.capacity;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
