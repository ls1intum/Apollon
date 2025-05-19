import { ComposePreview } from '../compose-preview';
import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { PrototypeRectangle } from './prototype-rectangle/prototype-rectangle';
import { PrototypeLabel } from './prototype-label/prototype-label';
import { SfcEnd } from './sfc-end/sfc-end';
import { SfcStart } from './sfc-start/sfc-start';
import { SfcStep } from './sfc-step/sfc-step';

export const composeSfcPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const prototypeRectangle = new PrototypeRectangle({ name: translate('packages.Sfc.PrototypeRectangle') });

  const prototypeLabel = new PrototypeLabel({
    name: translate('packages.Sfc.PrototypeLabel'),
    owner: prototypeRectangle.id,
  });

  prototypeRectangle.ownedElements = [prototypeLabel.id];

  const sfcStart = new SfcStart({ name: translate('packages.Sfc.Start') });
  const sfcStep = new SfcStep({ name: translate('packages.Sfc.Step') });
  const sfcEnd = new SfcEnd();

  return [
    ...(prototypeRectangle.render(layer, [prototypeLabel]) as UMLElement[]),
    ...(sfcStart.render(layer) as UMLElement[]),
    ...(sfcStep.render(layer) as UMLElement[]),
    ...(sfcEnd.render(layer) as UMLElement[]),
  ];
};
