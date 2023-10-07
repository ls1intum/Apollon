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

export type BPMNGatewayType = 'complex' | 'event-based' | 'exclusive' | 'exclusive-event-based' | 'inclusive' | 'parallel' | 'parallel-event-based';

export class BPMNGateway extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };
  static defaultGatewayType: BPMNGatewayType = 'exclusive';

  type: UMLElementType = BPMNElementType.BPMNGateway;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  gatewayType: BPMNGatewayType;

  constructor(values?: DeepPartial<BPMNGateway>) {
    super(values);
    assign<IUMLElement>(this, values);
    this.gatewayType = values?.gatewayType || BPMNGateway.defaultGatewayType;
  }

  serialize(children?: UMLElement[]): Apollon.BPMNGateway {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      gatewayType: this.gatewayType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { gatewayType?: BPMNGatewayType },
    children?: Apollon.UMLModelElement[],
  ) {
    super.deserialize(values, children);
    this.gatewayType = values.gatewayType || BPMNGateway.defaultGatewayType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
