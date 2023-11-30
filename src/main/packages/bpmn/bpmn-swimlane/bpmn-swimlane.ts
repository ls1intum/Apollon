import { BPMNElementType } from '..';
import { UMLElementType } from '../../uml-element-type';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNSwimlane extends UMLContainer {
  static DEFAULT_HEIGHT = 80;
  static MIN_HEIGHT = 80;

  static features: UMLElementFeatures = {
    ...UMLElement.features,
    droppable: true,
    movable: false,
    connectable: false,
    updatable: false,
    resizable: 'HEIGHT',
  };

  type: UMLElementType = BPMNElementType.BPMNSwimlane;

  render(layer: ILayer, children: ILayoutable[] = []): ILayoutable[] {
    if (this.bounds.height < BPMNSwimlane.MIN_HEIGHT) {
      this.bounds.height = BPMNSwimlane.MIN_HEIGHT;
    }

    return [this, ...children];
  }
}
