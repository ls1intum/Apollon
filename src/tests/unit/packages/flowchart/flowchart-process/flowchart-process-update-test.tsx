import React from 'react';

import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { FlowchartProcess } from '../../../../../main/packages/flowchart/flowchart-process/flowchart-process';
import { FlowchartProcessUpdate } from '../../../../../main/packages/flowchart/flowchart-process/flowchart-process-update';

describe('test flowchart input output update', () => {
  let elements: UMLElement[] = [];
  let process: FlowchartProcess;

  beforeEach(() => {
    // initialize  objects
    process = new FlowchartProcess({
      id: 'test-id',
    });
    elements.push(process);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartProcessUpdate element={process} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartProcessUpdate element={process} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';
    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[process.id] as FlowchartProcess;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartProcessUpdate element={process} />, { store: store });
    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(process.id);
  });
});
