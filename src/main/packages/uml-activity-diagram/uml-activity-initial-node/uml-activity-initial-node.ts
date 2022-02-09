import { DeepPartial } from 'redux';
import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import { assign } from '../../../utils/fx/assign.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLActivityInitialNode extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];

  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false, updatable: false };

  type: UMLElementType = ActivityElementType.ActivityInitialNode;
  bounds: IBoundary = { ...this.bounds, width: 45, height: 45 };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
