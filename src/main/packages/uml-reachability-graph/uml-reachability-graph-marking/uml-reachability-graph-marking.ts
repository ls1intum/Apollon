import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';
import * as Apollon from '../../../typings';
import { ReachabilityGraphElementType } from '..';
import { DeepPartial } from 'redux';
import { calculateNameBounds } from '../../../utils/name-bounds';

export class UMLReachabilityGraphMarking extends UMLElement {
  type: UMLElementType = ReachabilityGraphElementType.ReachabilityGraphMarking;
  isInitialMarking: boolean;

  constructor(values?: DeepPartial<UMLReachabilityGraphMarking>) {
    super(values);
    this.isInitialMarking = values?.isInitialMarking || false;
  }

  serialize(children?: UMLElement[]): Apollon.UMLReachabilityGraphMarking {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof ReachabilityGraphElementType,
      isInitialMarking: this.isInitialMarking,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLReachabilityGraphMarking =>
      v.type === ReachabilityGraphElementType.ReachabilityGraphMarking;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.isInitialMarking = values.isInitialMarking;
  }

  render(canvas: ILayer): ILayoutable[] {
    this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
}
