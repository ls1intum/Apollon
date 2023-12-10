import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';
import * as Apollon from '../../../typings';
import { BPMNMarkerType } from '../common/types';

export type BPMNTaskType = 'default' | 'user' | 'send' | 'receive' | 'manual' | 'business-rule' | 'script';

export class BPMNTask extends UMLContainer {
  static defaultTaskType: BPMNTaskType = 'default';
  static defaultMarker: BPMNMarkerType = 'none';

  type: UMLElementType = BPMNElementType.BPMNTask;
  taskType: BPMNTaskType;
  marker: BPMNMarkerType;

  constructor(values?: DeepPartial<BPMNTask>) {
    super(values);
    assign<BPMNTask>(this, values);
    this.taskType = values?.taskType || BPMNTask.defaultTaskType;
    this.marker = values?.marker || BPMNTask.defaultMarker;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNTask {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      taskType: this.taskType,
      marker: this.marker,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { taskType?: BPMNTaskType; marker?: BPMNMarkerType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.taskType = values.taskType || BPMNTask.defaultTaskType;
    this.marker = values.marker || BPMNTask.defaultMarker;
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
