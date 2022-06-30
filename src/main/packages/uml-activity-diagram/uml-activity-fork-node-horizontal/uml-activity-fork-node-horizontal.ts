import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';

export class UMLActivityForkNodeHorizontal extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };
  static defaultWidth = 60;
  static defaultHeight = 20;

  type: UMLElementType = ActivityElementType.ActivityForkNodeHorizontal;
  bounds: IBoundary = {
    ...this.bounds,
  };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds.width = (values && values.bounds && values.bounds.width) || UMLActivityForkNodeHorizontal.defaultWidth;
    this.bounds.height = UMLActivityForkNodeHorizontal.defaultHeight;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.width = Math.max(this.bounds.width, UMLActivityForkNodeHorizontal.defaultWidth);
    return [this];
  }
}
