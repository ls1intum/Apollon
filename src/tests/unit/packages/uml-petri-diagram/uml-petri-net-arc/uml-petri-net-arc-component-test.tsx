import React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLPetriNetArc } from '../../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc';
import { UMLPetriNetArcComponent } from '../../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-component';
import { UMLPetriNetPlace } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';

it('render the uml-petri-net-arc-component', () => {
  const source: UMLPetriNetPlace = new UMLPetriNetPlace({ name: 'TestPetriNetArc' });
  const target: UMLPetriNetPlace = new UMLPetriNetPlace({ name: 'TestPetriNetArc' });
  const element: UMLPetriNetArc = new UMLPetriNetArc({
    id: 'test-id',
    name: 'TestPetriNetArc',
    source: { element: source.id, direction: Direction.Up },
    target: { element: target.id, direction: Direction.Up },
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLPetriNetArcComponent element={element} />
    </svg>,
  );
  expect(getByText(element.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
