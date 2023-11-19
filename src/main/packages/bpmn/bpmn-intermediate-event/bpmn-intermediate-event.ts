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

export type BPMNIntermediateEventType =
  | 'default'
  | 'message-catch'
  | 'message-throw'
  | 'timer-catch'
  | 'escalation-throw'
  | 'conditional-catch'
  | 'link-catch'
  | 'link-throw'
  | 'compensation-throw'
  | 'signal-catch'
  | 'signal-throw';

export class BPMNIntermediateEvent extends UMLContainer {
  static supportedRelationships = [BPMNRelationshipType.BPMNFlow];
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };
  static defaultEventType: BPMNIntermediateEventType = 'default';

  type: UMLElementType = BPMNElementType.BPMNIntermediateEvent;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  eventType: BPMNIntermediateEventType;

  constructor(values?: DeepPartial<BPMNIntermediateEvent>) {
    super(values);
    assign<UMLContainer>(this, values);
    this.eventType = values?.eventType || BPMNIntermediateEvent.defaultEventType;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNIntermediateEvent {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      eventType: this.eventType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { eventType?: BPMNIntermediateEventType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.eventType = values.eventType || BPMNIntermediateEvent.defaultEventType;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
