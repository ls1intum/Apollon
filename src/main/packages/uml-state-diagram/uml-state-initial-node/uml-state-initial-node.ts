import { DeepPartial } from 'redux';
import { StateElementType, StateRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementFeatures } from '../../../services/uml-element/uml-element-features';
import { assign } from '../../../utils/fx/assign';
import { IBoundary } from '../../../utils/geometry/boundary';

export class UMLStateInitialNode extends UMLElement {
  static supportedRelationships = [StateRelationshipType.StateTransition];

  static features: UMLElementFeatures = { ...UMLElement.features, resizable: false, updatable: false };

  type = StateElementType.StateInitialNode;
  bounds: IBoundary = { ...this.bounds, width: 50, height: 50 };

  constructor(values?: DeepPartial<IUMLElement>) {
    super(values);
    assign<IUMLElement>(this, values);
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
} 