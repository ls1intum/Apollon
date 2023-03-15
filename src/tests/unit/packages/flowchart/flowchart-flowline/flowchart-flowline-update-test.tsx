import React from 'react';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClassBidirectional } from '../../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { FlowchartTerminal } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import { FlowchartFlowline } from '../../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline';
import { FlowchartFlowlineUpdate } from '../../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline-update';

describe('test flowchart flowline update', () => {
  let elements: UMLElement[] = [];
  let source: FlowchartTerminal;
  let target: FlowchartTerminal;
  let flowline: FlowchartFlowline;

  beforeEach(() => {
    // initialize  objects
    source = new FlowchartTerminal({ id: 'source-test-id' });
    target = new FlowchartTerminal({ id: 'target-test-id' });
    flowline = new FlowchartFlowline({
      id: 'test-id',
      name: 'FlowchartFlowline',
      source: { element: source.id, direction: Direction.Up },
      target: { element: target.id, direction: Direction.Up },
    });
    elements.push(source, target, flowline);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<FlowchartFlowlineUpdate element={flowline} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('flip', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartFlowlineUpdate element={flowline} />, { store: store });
    const buttons = getAllByRole('button');

    act(() => {
      fireEvent.click(buttons[0]);
    });

    const element = store.getState().elements[flowline.id] as UMLClassBidirectional;

    expect(element.target).toEqual(flowline.source);
    expect(element.source).toEqual(flowline.target);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<FlowchartFlowlineUpdate element={flowline} />, { store: store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[1]);
    });

    expect(store.getState().elements).not.toContain(flowline.id);
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<FlowchartFlowlineUpdate element={flowline} />, {
      store: store,
    });
    const nameField = getByRole('textbox');
    const updatedValue = '1';
    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[flowline.id] as FlowchartFlowline;

    expect(updatedElement.name).toEqual(updatedValue);
  });
});
