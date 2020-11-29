import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { DeploymentRelationshipType } from '../../uml-deployment-diagram';
import { ComponentRelationshipType } from '../../uml-component-diagram';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { computeBoundingBoxForElements } from '../../../utils/geometry/boundary';
import { Point } from '../../../utils/geometry/point';
import { REQUIRED_INTERFACE_MARKER_SIZE } from './uml-interface-requires-constants';

export abstract class UMLInterfaceRequired extends UMLRelationship {
  static features = { ...UMLRelationship.features, variable: false };

  static isUMLInterfaceRequired = (element: IUMLElement): element is IUMLRelationship => {
    return (
      UMLInterfaceRequired.isUMLRelationship(element) &&
      (element.type === DeploymentRelationshipType.DeploymentInterfaceRequired ||
        element.type === ComponentRelationshipType.ComponentInterfaceRequired)
    );
  };

  render(canvas: ILayer, source?: UMLElement, target?: UMLElement): ILayoutable[] {
    super.render(canvas, source, target);

    const pathBounds = this.bounds;

    // calculate end of path
    const lastPathPoint = this.path[this.path.length - 1];
    const pathEnd = new Point(this.bounds.x, this.bounds.y).add(lastPathPoint.x, lastPathPoint.y);

    // calculate marker bounding box
    const markerBoundingBox = {
      bounds: {
        x: pathEnd.x - Math.floor(REQUIRED_INTERFACE_MARKER_SIZE / 2),
        y: pathEnd.y - Math.floor(REQUIRED_INTERFACE_MARKER_SIZE / 2),
        width: REQUIRED_INTERFACE_MARKER_SIZE,
        height: REQUIRED_INTERFACE_MARKER_SIZE,
      },
    };

    this.bounds = computeBoundingBoxForElements([this, markerBoundingBox]);

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
