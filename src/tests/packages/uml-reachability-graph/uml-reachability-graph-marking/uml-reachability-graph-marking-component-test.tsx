import React from 'react';
import { render } from '@testing-library/react';
import { UMLReachabilityGraphMarking } from '../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking';
import { UMLReachabilityGraphMarkingComponent } from '../../../../main/packages/uml-reachability-graph/uml-reachability-graph-marking/uml-reachability-graph-marking-component';

describe('uml-reachability-graph-marking-component', () => {
  let element: UMLReachabilityGraphMarking;
  beforeEach(() => {
    element = new UMLReachabilityGraphMarking({});
  });

  it('render the uml-reachability-graph-marking-component', () => {
    const { baseElement } = render(
      <svg>
        <UMLReachabilityGraphMarkingComponent element={element} />
      </svg>,
    );
    expect(baseElement).toMatchSnapshot();
  });

  it('render with isInitialMarking false', () => {
    element.isInitialMarking = false;
    const { container } = render(
      <svg>
        <UMLReachabilityGraphMarkingComponent element={element} />
      </svg>,
    );
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
  });

  it('render with isInitialMarking true', () => {
    element.isInitialMarking = true;
    const { container } = render(
      <svg>
        <UMLReachabilityGraphMarkingComponent element={element} />
      </svg>,
    );
    expect(container.querySelectorAll('polyline')).toHaveLength(1);
  });
});
