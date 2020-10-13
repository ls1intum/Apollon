import { DeepPartial } from 'redux';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { Direction, IUMLElementPort } from '../../../services/uml-element/uml-element-port';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { assign } from '../../../utils/fx/assign';
import { computeBoundingBoxForElements, IBoundary } from '../../../utils/geometry/boundary';
import {
  computeTextPositionForUMLAssociation,
  getMarkerForTypeForUMLAssociation,
  layoutTextForUMLAssociation,
} from './uml-association-component';
import { Text } from '../../../utils/svg/text';
import { Point } from '../../../utils/geometry/point';

export interface IUMLAssociation extends IUMLRelationship {
  source: IUMLElementPort & {
    multiplicity: string;
    role: string;
  };
  target: IUMLElementPort & {
    multiplicity: string;
    role: string;
  };
}

const textWithLayoutPropertiesToBounds = (
  layer: ILayer,
  anchor: Point,
  text: string,
  layoutOptions: { dx?: number; dy?: number; textAnchor: string },
): { bounds: IBoundary } => {
  const textSize = Text.size(layer, text, { textAnchor: layoutOptions.textAnchor });
  return {
    bounds: {
      x:
        anchor.x +
        (layoutOptions.textAnchor === 'end' ? -textSize.width : 0) +
        (layoutOptions.dx ? layoutOptions.dx : 0),
      y: anchor.y + (layoutOptions.dy ? layoutOptions.dy : 0),
      width: textSize.width,
      height: textSize.height,
    },
  };
};

export abstract class UMLAssociation extends UMLRelationship implements IUMLAssociation {
  source: IUMLAssociation['source'] = {
    direction: Direction.Up,
    element: '',
    multiplicity: '',
    role: '',
  };
  target: IUMLAssociation['target'] = {
    direction: Direction.Up,
    element: '',
    multiplicity: '',
    role: '',
  };

  constructor(values?: DeepPartial<IUMLAssociation>) {
    super();
    assign<IUMLAssociation>(this, values);
  }

  render(canvas: ILayer, source?: UMLElement, target?: UMLElement): ILayoutable[] {
    super.render(canvas, source, target);

    // TODO: hacky way of computing bounding box, should follow layoutable (make connection text layoutable)
    const pathBounds = this.bounds;

    // multiplicity
    const sourceMultiplicity = layoutTextForUMLAssociation(this.source.direction, 'BOTTOM');
    const targetMultiplicity = layoutTextForUMLAssociation(this.target.direction, 'BOTTOM');

    // roles
    const sourceRole = layoutTextForUMLAssociation(this.source.direction, 'TOP');
    const targetRole = layoutTextForUMLAssociation(this.target.direction, 'TOP');

    // calculate anchor points
    // anchor point = endOfPath + this.position
    const marker = getMarkerForTypeForUMLAssociation(this.type);
    const path = this.path.map((point) => new Point(point.x, point.y));
    const sourceAnchor: Point = computeTextPositionForUMLAssociation(path).add(this.bounds.x, this.bounds.y);
    const targetAnchor: Point = computeTextPositionForUMLAssociation(path.reverse(), !!marker).add(
      this.bounds.x,
      this.bounds.y,
    );

    const boundingElements = [
      textWithLayoutPropertiesToBounds(canvas, sourceAnchor, this.source.multiplicity, sourceMultiplicity),
      textWithLayoutPropertiesToBounds(canvas, targetAnchor, this.target.multiplicity, targetMultiplicity),
      textWithLayoutPropertiesToBounds(canvas, sourceAnchor, this.source.role, sourceRole),
      textWithLayoutPropertiesToBounds(canvas, targetAnchor, this.target.role, targetRole),
    ];

    this.bounds = computeBoundingBoxForElements([this, ...boundingElements]);

    const horizontalTranslation = pathBounds.x - this.bounds.x;
    const verticalTranslation = pathBounds.y - this.bounds.y;

    // translation of path points, because they are relative to their own bounding box
    // the bounding may be different now -> translation to correct this
    this.path.forEach((point) => {
      point.x += horizontalTranslation;
      point.y += verticalTranslation;
    });

    return [this];
  }
}
