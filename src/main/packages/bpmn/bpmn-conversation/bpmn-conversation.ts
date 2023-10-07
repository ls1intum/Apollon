import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';
import * as Apollon from '../../../typings';

export type BPMNConversationType = 'default' | 'call';

export class BPMNConversation extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };
  static defaultConversationType: BPMNConversationType = 'default';

  type: UMLElementType = BPMNElementType.BPMNConversation;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  conversationType: BPMNConversationType;

  constructor(values?: DeepPartial<BPMNConversation>) {
    super(values);
    assign<IUMLElement>(this, values);
    this.conversationType = values?.conversationType || BPMNConversation.defaultConversationType;
  }

  serialize(children?: UMLElement[]): Apollon.BPMNConversation {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      conversationType: this.conversationType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { conversationType?: BPMNConversationType },
    children?: Apollon.UMLModelElement[],
  ) {
    super.deserialize(values, children);
    this.conversationType = values.conversationType || BPMNConversation.defaultConversationType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
