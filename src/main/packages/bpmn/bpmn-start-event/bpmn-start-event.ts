import { DeepPartial } from 'redux';
import { BPMNElementType, BPMNRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';

export class BPMNStartEvent extends UMLElement {
  static supportedRelationships = [BPMNRelationshipType.BPMNFlow];
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false };

  type: UMLElementType = BPMNElementType.BPMNStartEvent;
  bounds: IBoundary = { ...this.bounds, width: 40, height: 40 };
  name = 'Start Event';

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
