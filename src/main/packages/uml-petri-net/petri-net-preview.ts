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

  const petriNetTransition = new UMLPetriNetTransition({ name: translate('packages.PetriNet.PetriNetTransition') });
  petriNetTransition.bounds = {
    ...petriNetTransition.bounds,
    width: petriNetTransition.bounds.width * scale,
    height: petriNetTransition.bounds.height * scale,
  };
  // Petri Net Transition
  elements.push(
    Object.assign<UMLPetriNetTransition, { styles?: CSSProperties }>(petriNetTransition, {
      styles: {
        marginTop: '25px',
      },
    }),
  );

  // Petri Net Place
  const petriNetPlace = new UMLPetriNetPlace({ name: translate('packages.PetriNet.PetriNetPlace') });
  petriNetPlace.bounds = {
    ...petriNetPlace.bounds,
    width: petriNetPlace.bounds.width * scale,
    height: petriNetPlace.bounds.height * scale,
  };
  elements.push(petriNetPlace);

  return elements;
};
