import { ActivityElementType, ActivityRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementType } from '../../uml-element-type.js';

export class UMLActivityObjectNode extends UMLElement {
  static supportedRelationships = [ActivityRelationshipType.ActivityControlFlow];

  type: UMLElementType = ActivityElementType.ActivityObjectNode;

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
