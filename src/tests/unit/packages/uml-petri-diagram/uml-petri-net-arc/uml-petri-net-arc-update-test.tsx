import React from 'react';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClassBidirectional } from '../../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { UMLPetriNetPlace } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place';
import { UMLPetriNetArc } from '../../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc';
import { UMLPetriNetArcUpdate } from '../../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-update';

describe('test petri net arc update', () => {
  let elements: UMLElement[] = [];
  let source: UMLPetriNetPlace;
  let target: UMLPetriNetPlace;
  let petriNetArc: UMLPetriNetArc;

  beforeEach(() => {
    // initialize  objects
    source = new UMLPetriNetPlace({ id: 'source-test-id' });
    target = new UMLPetriNetPlace({ id: 'target-test-id' });
    petriNetArc = new UMLPetriNetArc({
      id: 'test-id',
      name: 'UMLClassBidirectional',
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
    });
    elements.push(source, target, petriNetArc);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLPetriNetArcUpdate element={petriNetArc} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('flip', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLPetriNetArcUpdate element={petriNetArc} />, { store: store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[0]);
    });

    const element = store.getState().elements[petriNetArc.id] as UMLClassBidirectional;

    expect(element.target).toEqual(petriNetArc.source);
    expect(element.source).toEqual(petriNetArc.target);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLPetriNetArcUpdate element={petriNetArc} />, { store: store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[1]);
    });

    expect(store.getState().elements).not.toContain(petriNetArc.id);
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<UMLPetriNetArcUpdate element={petriNetArc} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = '1';
    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[petriNetArc.id] as UMLPetriNetArc;

    expect(updatedElement.name).toEqual(updatedValue);
  });
});
