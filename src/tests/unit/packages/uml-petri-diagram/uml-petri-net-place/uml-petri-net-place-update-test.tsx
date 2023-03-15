import React from 'react';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { UMLPetriNetPlace } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place';
import { UMLPetriNetPlaceUpdate } from '../../../../../main/packages/uml-petri-net/uml-petri-net-place/uml-petri-net-place-update';

describe('test petri net arc update', () => {
  let elements: UMLElement[] = [];
  let petriNetPlace: UMLPetriNetPlace;

  beforeEach(() => {
    // initialize  objects
    petriNetPlace = new UMLPetriNetPlace({
      id: 'test-id',
    });
    elements.push(petriNetPlace);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLPetriNetPlaceUpdate element={petriNetPlace} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<UMLPetriNetPlaceUpdate element={petriNetPlace} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';
    fireEvent.change(nameField, { target: { value: updatedValue } });

    const updatedElement = store.getState().elements[petriNetPlace.id] as UMLPetriNetPlace;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('change tokenAmount', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLPetriNetPlaceUpdate element={petriNetPlace} />, {
      store: store,
    });
    const amountOfTokensField = getAllByRole('spinbutton')[0];
    const updatedValue = 3;
    fireEvent.change(amountOfTokensField, { target: { value: updatedValue } });

    const updatedElement = store.getState().elements[petriNetPlace.id] as UMLPetriNetPlace;

    expect(updatedElement.amountOfTokens).toEqual(updatedValue);
  });

  it('change capacity', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLPetriNetPlaceUpdate element={petriNetPlace} />, {
      store: store,
    });
    const capacityField = getAllByRole('spinbutton')[1];
    const newCapacity = 1;
    fireEvent.change(capacityField, { target: { value: newCapacity } });

    const updatedElement = store.getState().elements[petriNetPlace.id] as UMLPetriNetPlace;

    expect(updatedElement.capacity).toEqual(newCapacity);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLPetriNetPlaceUpdate element={petriNetPlace} />, { store: store });
    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(petriNetPlace.id);
  });
});
