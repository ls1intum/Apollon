import { ILayer } from '../../services/layouter/layer';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { UMLPetriNetPlace } from './uml-petri-net-place/uml-petri-net-place';
import { UMLPetriNetTransition } from './uml-petri-net-transition/uml-petri-net-transition';
import { CSSProperties } from 'react';

export const composePetriNetPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];

  // Petri Net Transition
  elements.push(
    Object.assign<UMLPetriNetTransition, { styles?: CSSProperties }>(
      new UMLPetriNetTransition({ name: translate('packages.PetriNet.PetriNetTransition') }),
      {
        styles: {
          marginTop: '25px',
        },
      },
    ),
  );

  // Petri Net Place
  elements.push(new UMLPetriNetPlace({ name: translate('packages.PetriNet.PetriNetPlace') }));

  return elements;
};
