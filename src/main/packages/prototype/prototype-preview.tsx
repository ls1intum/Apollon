import { ComposePreview } from '../compose-preview';
import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { PrototypeRectangle } from './prototype-rectangle/prototype-rectangle';
import { PrototypeLabel } from './prototype-label/prototype-label';

export const composePrototypePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  const prototypeRectangle = new PrototypeRectangle({ name: translate('packages.Prototype.PrototypeRectangle') });

  const prototypeLabel = new PrototypeLabel({
    name: translate('packages.Prototype.PrototypeLabel'),
    owner: prototypeRectangle.id,
  });

  prototypeRectangle.ownedElements = [prototypeLabel.id];
  elements.push(...(prototypeRectangle.render(layer, [prototypeLabel]) as UMLElement[]));

  return elements;
};
