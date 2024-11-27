import { StateElementType, StateRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { IBoundary } from '../../../utils/geometry/boundary';
import { calculateNameBounds } from '../../../utils/name-bounds';

export class UMLStateMergeNode extends UMLElement {
  static supportedRelationships = [StateRelationshipType.StateTransition];
  type = StateElementType.StateMergeNode;
  bounds: IBoundary = { ...this.bounds };

  render(canvas: ILayer): ILayoutable[] {
    this.bounds = calculateNameBounds(this, canvas);
    return [this];
  }
} 