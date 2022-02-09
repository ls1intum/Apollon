import { DeepPartial } from 'redux';
import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features.js';
import { IBoundary } from '../../../utils/geometry/boundary.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLActivityForkNode extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = ActivityElementType.ActivityForkNode;
  bounds: IBoundary = {
    ...this.bounds,
  };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds.height = (values && values.bounds && values.bounds.height) || UMLActivityForkNode.defaultHeight;
    this.bounds.width = UMLActivityForkNode.defaultWidth;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLActivityForkNode.defaultHeight);
    return [this];
  }
}
