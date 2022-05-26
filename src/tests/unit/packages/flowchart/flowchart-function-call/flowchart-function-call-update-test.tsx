import React from 'react';

import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { fireEvent } from '@testing-library/react';
import { FlowchartFunctionCall } from '../../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call';
import { FlowchartFunctionCallUpdate } from '../../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call-update';

describe('test flowchart function call update', () => {
  let elements: UMLElement[] = [];
  let functionCall: FlowchartFunctionCall;

  beforeEach(() => {
    // initialize  objects
    functionCall = new FlowchartFunctionCall({
      id: 'test-id',
    });
    elements.push(functionCall);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartFunctionCallUpdate element={functionCall} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartFunctionCallUpdate element={functionCall} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = 'Start';
    fireEvent.change(nameField, { target: { value: updatedValue } });

    const updatedElement = store.getState().elements[functionCall.id] as FlowchartFunctionCall;

    expect(updatedElement.name).toEqual(updatedValue);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartFunctionCallUpdate element={functionCall} />, { store: store });
    const buttons = getAllByRole('button');
    // delete button
    buttons[0].click();

    expect(store.getState().elements).not.toContain(functionCall.id);
  });
});
