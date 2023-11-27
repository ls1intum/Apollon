import { DeepPartial } from 'redux';
import { BPMNElementType, BPMNRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import * as Apollon from '../../../typings';

export type BPMNStartEventType = 'default' | 'message' | 'timer' | 'conditional' | 'signal';

export class BPMNStartEvent extends UMLContainer {
  static supportedRelationships = [BPMNRelationshipType.BPMNFlow];
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };
  static defaultEventType: BPMNStartEventType = 'default';

  type: UMLElementType = BPMNElementType.BPMNStartEvent;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  eventType: BPMNStartEventType;

  constructor(values?: DeepPartial<BPMNStartEvent>) {
    super(values);
    assign<UMLContainer>(this, values);
    this.eventType = values?.eventType || BPMNStartEvent.defaultEventType;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNStartEvent {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      eventType: this.eventType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { eventType?: BPMNStartEventType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.eventType = values.eventType || BPMNStartEvent.defaultEventType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
