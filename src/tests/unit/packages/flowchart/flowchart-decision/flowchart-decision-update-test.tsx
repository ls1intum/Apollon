import React from 'react';

import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { FlowchartDecision } from '../../../../../main/packages/flowchart/flowchart-decision/flowchart-decision';
import { FlowchartDecisionUpdate } from '../../../../../main/packages/flowchart/flowchart-decision/flowchart-decision-update';

describe('test flowchart decision update', () => {
  let elements: UMLElement[] = [];
  let decision: FlowchartDecision;

  beforeEach(() => {
    // initialize  objects
    decision = new FlowchartDecision({
      id: 'test-id',
    });
    elements.push(decision);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartDecisionUpdate element={decision} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartDecisionUpdate element={decision} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';

    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[decision.id] as FlowchartDecision;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartDecisionUpdate element={decision} />, { store: store });

    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });
    expect(store.getState().elements).not.toContain(decision.id);
  });
});
