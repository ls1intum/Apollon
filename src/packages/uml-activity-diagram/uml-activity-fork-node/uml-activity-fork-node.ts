import { ActivityElementType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';
import { assign } from '../../../utils/fx/assign';

export class UMLActivityForkNode extends UMLElement {
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = ActivityElementType.ActivityForkNode;
  bounds: IBoundary = {
    ...this.bounds,
    width: UMLActivityForkNode.defaultWidth,
    height: UMLActivityForkNode.defaultHeight,
  };

  constructor(values?: DeepPartial<IUMLElement>) {
    super();
    assign<IUMLElement>(this, values);
    this.bounds.height = (values && values.bounds && values.bounds.height) || UMLActivityForkNode.defaultHeight;
    this.bounds.width = (values && values.bounds && values.bounds.width) || UMLActivityForkNode.defaultWidth;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLActivityForkNode.defaultHeight);
    this.bounds.width = Math.max(this.bounds.width, UMLActivityForkNode.defaultWidth);
    return [this];
  }
}
