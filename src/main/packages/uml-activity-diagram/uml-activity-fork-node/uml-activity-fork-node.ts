import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';

export class UMLActivityForkNode extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = ActivityElementType.ActivityForkNode;

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds = {
      ...this.bounds,
      width: UMLActivityForkNode.defaultWidth,
      height: values?.bounds?.height ?? UMLActivityForkNode.defaultHeight,
    };
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLActivityForkNode.defaultHeight);
    return [this];
  }
}
