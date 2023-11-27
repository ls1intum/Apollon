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

export type BPMNEndEventType = 'default' | 'message' | 'escalation' | 'error' | 'compensation' | 'signal' | 'terminate';

export class BPMNEndEvent extends UMLContainer {
  static supportedRelationships = [BPMNRelationshipType.BPMNFlow];
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };
  static defaultEventType: BPMNEndEventType = 'default';

  type: UMLElementType = BPMNElementType.BPMNEndEvent;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  eventType: BPMNEndEventType;

  constructor(values?: DeepPartial<BPMNEndEvent>) {
    super(values);
    assign<UMLContainer>(this, values);
    this.eventType = values?.eventType || BPMNEndEvent.defaultEventType;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNEndEvent {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      eventType: this.eventType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { eventType?: BPMNEndEventType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.eventType = values.eventType || BPMNEndEvent.defaultEventType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
