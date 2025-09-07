import { DeepPartial } from 'redux';
import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { UMLElementType } from '../../uml-element-type';

export class UMLActivityFinalNode extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];
  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false, updatable: false };

  type: UMLElementType = ActivityElementType.ActivityFinalNode;

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
    this.bounds = { ...this.bounds, width: values?.bounds?.width ?? 50, height: values?.bounds?.height ?? 50 };
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
