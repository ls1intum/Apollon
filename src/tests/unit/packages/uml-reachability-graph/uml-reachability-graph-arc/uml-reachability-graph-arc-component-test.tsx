import React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLReachabilityGraphArc } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc';
import { UMLReachabilityGraphArcComponent } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-arc/uml-reachability-graph-arc-component';
import { UMLReachabilityGraphMarking } from '../../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking';
import { Direction } from '../../../../../main/services/uml-element/uml-element-port';

it('render the uml-reachability-graph-arc-component', () => {
  const source: UMLReachabilityGraphMarking = new UMLReachabilityGraphMarking({ name: 'TestReachabilityGraphArc' });
  const target: UMLReachabilityGraphMarking = new UMLReachabilityGraphMarking({ name: 'TestReachabilityGraphArc' });
  const element: UMLReachabilityGraphArc = new UMLReachabilityGraphArc({
    id: 'test-id',
    name: 'TestReachabilityGraphArc',
    source: { element: source.id, direction: Direction.Up },
    target: { element: target.id, direction: Direction.Up },
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLReachabilityGraphArcComponent element={element} />
    </svg>,
  );
  expect(getByText(element.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
