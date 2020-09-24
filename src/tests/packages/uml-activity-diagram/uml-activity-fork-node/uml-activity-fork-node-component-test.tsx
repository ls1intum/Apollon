import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLActivityForkNode } from '../../../../main/packages/uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node';
import { UMLActivityForkNodeComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node-component';

it('render the uml-activity-fork-node-component', () => {
  const forkNode: UMLActivityForkNode = new UMLActivityForkNode({ name: 'TestActivityComponent' });
  const { container, baseElement } = render(
    <svg>
      <UMLActivityForkNodeComponent element={forkNode} />
    </svg>,
  );
  expect(container.querySelector('rect')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
