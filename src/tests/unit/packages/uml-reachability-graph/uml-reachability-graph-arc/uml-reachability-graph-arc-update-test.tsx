import React from 'react';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { UMLClassBidirectional } from '../../../../../main/packages/uml-class-diagram/uml-class-bidirectional/uml-class-bidirectional';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';
import { getRealStore } from '../../../test-utils/test-utils';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { UMLReachabilityGraphArc } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc';
import { UMLReachabilityGraphArcUpdate } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc-update';
import { UMLReachabilityGraphMarking } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking';

describe('test reachability graph arc update', () => {
  const elements: UMLElement[] = [];
  let source: UMLReachabilityGraphMarking;
  let target: UMLReachabilityGraphMarking;
  let reachabilityGraphArc: UMLReachabilityGraphArc;

  beforeEach(() => {
    // initialize  objects
    act(() => {
      source = new UMLReachabilityGraphMarking({ id: 'source-test-id' });
      target = new UMLReachabilityGraphMarking({ id: 'target-test-id' });
      reachabilityGraphArc = new UMLReachabilityGraphArc({
        id: 'test-id',
        name: 'UMLClassBidirectional',
        source: { element: source.id, direction: Direction.Up },
        target: { element: target.id, direction: Direction.Up },
      });
    });
    elements.push(source, target, reachabilityGraphArc);
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<UMLReachabilityGraphArcUpdate element={reachabilityGraphArc} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('flip', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLReachabilityGraphArcUpdate element={reachabilityGraphArc} />, { store });
    const buttons = getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[0]);
    });

    const element = store.getState().elements[reachabilityGraphArc.id] as UMLClassBidirectional;

    expect(element.target).toEqual(reachabilityGraphArc.source);
    expect(element.source).toEqual(reachabilityGraphArc.target);
  });

  it('delete', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<UMLReachabilityGraphArcUpdate element={reachabilityGraphArc} />, { store });
    const buttons = getAllByRole('button');

    act(() => {
      fireEvent.click(buttons[1]);
    });

    expect(store.getState().elements).not.toContain(reachabilityGraphArc.id);
  });

  it('change name', () => {
    const store = getRealStore(undefined, elements);

    const { getByRole } = wrappedRender(<UMLReachabilityGraphArcUpdate element={reachabilityGraphArc} />, { store });
    const nameField = getByRole('textbox');
    const updatedValue = '0';
    act(() => {
      fireEvent.change(nameField, { target: { value: updatedValue } });
    });

    const updatedElement = store.getState().elements[reachabilityGraphArc.id] as UMLReachabilityGraphArc;

    expect(updatedElement.name).toEqual(updatedValue);
  });
});
