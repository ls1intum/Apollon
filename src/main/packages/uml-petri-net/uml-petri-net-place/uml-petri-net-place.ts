import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';
import * as Apollon from '../../../typings';
import { PetriNetElementType } from '../index';
import { assign } from '../../../utils/fx/assign';

export class UMLPetriNetPlace extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };
  static defaultCapacity = Number.POSITIVE_INFINITY;

  // currently we need to add this, because otherwise this will be recognized as update in layouter and for every update action on component, antoher update is triggerd
  highlight: string | undefined = undefined;
  type: UMLElementType = PetriNetElementType.PetriNetPlace;
  bounds: IBoundary = { ...this.bounds, width: 60, height: 60 };
  amountOfTokens: number;
  capacity: number;

  constructor(values?: DeepPartial<UMLPetriNetPlace>) {
    super(values);
    assign<IUMLElement>(this, values);
    this.amountOfTokens = values?.amountOfTokens || values?.amountOfTokens === 0 ? values.amountOfTokens : 0;
    this.capacity = values?.capacity || values?.capacity === 0 ? values.capacity : UMLPetriNetPlace.defaultCapacity;
  }

  serialize(children?: UMLElement[]): Apollon.UMLPetriNetPlace {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof PetriNetElementType,
      amountOfTokens: this.amountOfTokens,
      capacity: !isFinite(this.capacity) ? this.capacity.toString() : this.capacity,
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
    this.capacity =
      values.capacity === Number.POSITIVE_INFINITY.toString() ? Number.POSITIVE_INFINITY : (values.capacity as number);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
