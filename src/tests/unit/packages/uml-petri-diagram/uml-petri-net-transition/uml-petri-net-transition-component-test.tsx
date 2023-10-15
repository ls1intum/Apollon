import React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLPetriNetTransition } from '../../../../../main/packages/uml-petri-net/uml-petri-net-transition/uml-petri-net-transition';
import { UMLPetriNetTransitionComponent } from '../../../../../main/packages/uml-petri-net/uml-petri-net-transition/uml-petri-net-transition-component';

it('render the uml-petri-net-transition-component', () => {
  const element: UMLPetriNetTransition = new UMLPetriNetTransition({ name: 'Example Description' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLPetriNetTransitionComponent element={element} />
    </svg>,
  );
  expect(getByText(element.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
