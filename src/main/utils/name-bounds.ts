import { ILayer } from '../services/layouter/layer';
import { IBoundary, computeBoundingBoxForElements } from '../utils/geometry/boundary';
import { Text } from '../utils/svg/text';

export function calculateNameBounds(element: any, layer: ILayer) {
  const radix = 10;

  const nameBounds: IBoundary = {
    x: element.bounds.x,
    y: element.bounds.y,
    width: Math.round((Text.size(layer, element.name, { fontWeight: 'bold' }).width + 20) / radix) * radix,
    height: 20,
  };

  return computeBoundingBoxForElements([element, { bounds: nameBounds }]);
}
