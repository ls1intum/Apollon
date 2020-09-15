import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { IPath } from '../../utils/geometry/path';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { IUMLElementPort } from '../uml-element/uml-element-port';
import { Point } from '../../utils/geometry/point';
import { Text } from '../../utils/svg/text';
import { computeBoundingBoxForElements } from '../../utils/geometry/boundary';
import { UMLRelationship } from './uml-relationship';

export interface IUMLRelationship extends IUMLElement {
  type: UMLRelationshipType;
  path: IPath;
  source: IUMLElementPort;
  target: IUMLElementPort;
}

export abstract class UMLRelationshipCenteredDescription extends UMLRelationship {
  render(canvas: ILayer, source?: UMLElement, target?: UMLElement): ILayoutable[] {
    super.render(canvas, source, target);

    if (this.name) {
      const pathBounds = this.bounds;

      let descriptionPosition = new Point(0, 0);
      let direction: 'v' | 'h' = 'v';
      const path = this.path.map((point) => new Point(point.x, point.y));
      let distance =
        path.reduce(
          (length, point, i, points) =>
            i + 1 < points.length ? length + points[i + 1].subtract(point).length : length,
          0,
        ) / 2;

      for (let index = 0; index < path.length - 1; index++) {
        const vector = path[index + 1].subtract(path[index]);
        if (vector.length > distance) {
          const norm = vector.normalize();
          direction = Math.abs(norm.x) > Math.abs(norm.y) ? 'h' : 'v';
          descriptionPosition = path[index].add(norm.scale(distance));
          break;
        }
        distance -= vector.length;
      }

      // add this to make the messagePosition absolute and not relative to path origin
      descriptionPosition = descriptionPosition.add(pathBounds.x, pathBounds.y);

      const descriptionSize = Text.size(canvas, this.name);

      const test = {
        bounds: {
          x: direction === 'v' ? descriptionPosition.x + 5 : descriptionPosition.x - descriptionSize.width / 2,
          y: 'v' ? descriptionPosition.y + 5 : descriptionPosition.y,
          width: descriptionSize.width,
          height: descriptionSize.height,
        },
      };

      this.bounds = computeBoundingBoxForElements([this, test]);

      const horizontalTranslation = pathBounds.x - this.bounds.x;
      const verticalTranslation = pathBounds.y - this.bounds.y;

      // translation of path points, because they are relative to their own bounding box
      // the bounding may be different now -> translation to correct this
      this.path.forEach((point) => {
        point.x += horizontalTranslation;
        point.y += verticalTranslation;
      });
    }

    return [this];
  }
}
