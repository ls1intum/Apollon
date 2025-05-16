import { ComposePreview } from '../compose-preview';
import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { computeDimension } from '../../utils/geometry/boundary';
import { PrototypeRectangle } from './prototype-rectangle/prototype-rectangle';
import { PrototypeLabel } from './prototype-label/prototype-label';

export const composePrototypePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  const prototypeRectangle = new PrototypeRectangle({ name: translate('packages.Prototype.PrototypeRectangle') });
  prototypeRectangle.bounds = {
    ...prototypeRectangle.bounds,
    width: prototypeRectangle.bounds.width,
    height: prototypeRectangle.bounds.height,
  };

  const prototypeLabel = new PrototypeLabel({
    name: translate('packages.Prototype.PrototypeLabel'),
    owner: prototypeRectangle.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 25),
    },
  });
  prototypeRectangle.ownedElements = [prototypeLabel.id];
  elements.push(...(prototypeRectangle.render(layer, [prototypeLabel]) as UMLElement[]));

  return elements;
};
