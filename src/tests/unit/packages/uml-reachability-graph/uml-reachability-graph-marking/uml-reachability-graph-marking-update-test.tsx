import React from 'react';

import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { UMLReachabilityGraphMarking } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking';
import { UMLReachabilityGraphMarkingUpdate } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking-update';

describe('test reachability graph arc update', () => {
  const elements: UMLElement[] = [];
  let reachabilityGraphMarking: UMLReachabilityGraphMarking;

  beforeEach(() => {
    reachabilityGraphMarking = new UMLReachabilityGraphMarking({
      id: 'test-id',
    });
    elements.push(reachabilityGraphMarking);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLReachabilityGraphMarkingUpdate element={reachabilityGraphMarking} />, {
      store,
    });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<UMLReachabilityGraphMarkingUpdate element={reachabilityGraphMarking} />, {
      store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = '0';

    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[reachabilityGraphMarking.id] as UMLReachabilityGraphMarking;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('toggle isInitialMarking', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLReachabilityGraphMarkingUpdate element={reachabilityGraphMarking} />, {
      store,
    });
    const isInitialMarkingField = getAllByRole('checkbox')[0];
    const updatedValue = true;

    act(() => {
      fireEvent.click(isInitialMarkingField as Element);
    });

    const updatedElement = store.getState().elements[reachabilityGraphMarking.id] as UMLReachabilityGraphMarking;

    expect(updatedElement.isInitialMarking).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLReachabilityGraphMarkingUpdate element={reachabilityGraphMarking} />, {
      store,
    });
    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(reachabilityGraphMarking.id);
  });
});
