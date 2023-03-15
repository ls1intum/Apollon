import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { FlowchartTerminal } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import { FlowchartTerminalUpdate } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal-update';

describe('test flowchart input output update', () => {
  let elements: UMLElement[] = [];
  let terminal: FlowchartTerminal;

  beforeEach(() => {
    // initialize  objects
    terminal = new FlowchartTerminal({
      id: 'test-id',
    });
    elements.push(terminal);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartTerminalUpdate element={terminal} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartTerminalUpdate element={terminal} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';

    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[terminal.id] as FlowchartTerminal;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartTerminalUpdate element={terminal} />, { store: store });
    const buttons = getAllByRole('button');
    // delete button
    act(() => {
      fireEvent.click(buttons[0]);
    });

    expect(store.getState().elements).not.toContain(terminal.id);
  });
});
