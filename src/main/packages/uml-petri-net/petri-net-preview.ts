import { ILayer } from '../../services/layouter/layer';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { UMLPetriNetPlace } from './uml-petri-net-place/uml-petri-net-place';
import { UMLPetriNetTransition } from './uml-petri-net-transition/uml-petri-net-transition';
import { CSSProperties } from 'react';

export const composePetriNetPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  UMLPetriNetTransition.defaultHeight = 60 * scale;
  UMLPetriNetTransition.defaultWidth = 20 * scale;

  const petriNetTransition = new UMLPetriNetTransition({ name: translate('packages.PetriNet.PetriNetTransition') });

  // Petri Net Transition
  elements.push(
    Object.assign<UMLPetriNetTransition, { styles?: CSSProperties }>(petriNetTransition, {
      styles: {
        marginTop: '25px',
      },
    }),
  );

  // Petri Net Place
  const petriNetPlace = new UMLPetriNetPlace({
    name: translate('packages.PetriNet.PetriNetPlace'),
    bounds: { x: 0, y: 0, width: 60 * scale, height: 60 * scale },
  });

  elements.push(petriNetPlace);

  return elements;
};
