import { BPMNElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { calculateNameBounds } from '../../../utils/name-bounds';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';
import * as Apollon from '../../../typings';

export type BPMNTaskType = 'default' | 'user' | 'send' | 'receive' | 'manual' | 'business-rule' | 'script';

export class BPMNTask extends UMLContainer {
  static defaultTaskType: BPMNTaskType = 'default';

  type: UMLElementType = BPMNElementType.BPMNTask;
  taskType: BPMNTaskType;

  constructor(values?: DeepPartial<BPMNTask>) {
    super(values);
    assign<BPMNTask>(this, values);
    this.taskType = values?.taskType || BPMNTask.defaultTaskType;
  }

  serialize(children?: UMLContainer[]): Apollon.BPMNTask {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNElementType,
      taskType: this.taskType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { taskType?: BPMNTaskType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.taskType = values.taskType || BPMNTask.defaultTaskType;
  }

  render(canvas: ILayer): ILayoutable[] {
    //this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
}
