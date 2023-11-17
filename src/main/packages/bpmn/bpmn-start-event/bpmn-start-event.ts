import { DeepPartial } from 'redux';
import { BPMNElementType, BPMNRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { UMLContainer } from '../../../services/uml-container/uml-container';

export class BPMNStartEvent extends UMLContainer {
  static supportedRelationships = [BPMNRelationshipType.BPMNFlow];
  static features: UMLElementFeatures = { ...UMLContainer.features, resizable: false };

  type: UMLElementType = BPMNElementType.BPMNStartEvent;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };

  constructor(values?: DeepPartial<UMLContainer>) {
    super(values);
    assign<UMLContainer>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
