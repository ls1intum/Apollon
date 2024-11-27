import { StateElementType, StateRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { IBoundary } from '../../../utils/geometry/boundary';
import { UMLElementType } from '../../uml-element-type';
import { DeepPartial } from 'redux';

export class UMLStateForkNode extends UMLElement {
  static supportedRelationships = [StateRelationshipType.StateTransition];
  static features: UMLElementFeatures = { ...UMLElement.features, updatable: false };
  static defaultWidth = 20;
  static defaultHeight = 60;

  type: UMLElementType = StateElementType.StateForkNode;
  bounds: IBoundary = {
    ...this.bounds,
  };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    this.bounds.height = (values && values.bounds && values.bounds.height) || UMLStateForkNode.defaultHeight;
    this.bounds.width = UMLStateForkNode.defaultWidth;
  }

  render(layer: ILayer): ILayoutable[] {
    this.bounds.height = Math.max(this.bounds.height, UMLStateForkNode.defaultHeight);
    return [this];
  }
} 