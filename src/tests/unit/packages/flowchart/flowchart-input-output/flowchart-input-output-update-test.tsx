import React from 'react';

import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { FlowchartInputOutput } from '../../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output';
import { FlowchartInputOutputUpdate } from '../../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output-update';

describe('test flowchart input output update', () => {
  let elements: UMLElement[] = [];
  let inputOutput: FlowchartInputOutput;

  beforeEach(() => {
    // initialize  objects
    inputOutput = new FlowchartInputOutput({
      id: 'test-id',
    });
    elements.push(inputOutput);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartInputOutputUpdate element={inputOutput} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartInputOutputUpdate element={inputOutput} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';
    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[inputOutput.id] as FlowchartInputOutput;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartInputOutputUpdate element={inputOutput} />, { store: store });
    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(inputOutput.id);
  });
});
