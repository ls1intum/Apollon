import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';
import * as Apollon from '../../../typings';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export type BPMNGatewayType = 'complex' | 'event-based' | 'exclusive' | 'inclusive' | 'parallel';

export class BPMNGateway extends UMLContainer {
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };
  static defaultGatewayType: BPMNGatewayType = 'exclusive';

  type: UMLElementType = BPMNElementType.BPMNGateway;
  gatewayType: BPMNGatewayType;

  constructor(values?: DeepPartial<BPMNGateway>) {
    super(values);
    assign<BPMNGateway>(this, values);
    this.bounds = { ...this.bounds, width: values?.bounds?.width ?? 40, height: values?.bounds?.height ?? 40 };
    this.gatewayType = values?.gatewayType || BPMNGateway.defaultGatewayType;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNGateway {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      gatewayType: this.gatewayType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { gatewayType?: BPMNGatewayType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.gatewayType = values.gatewayType || BPMNGateway.defaultGatewayType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
