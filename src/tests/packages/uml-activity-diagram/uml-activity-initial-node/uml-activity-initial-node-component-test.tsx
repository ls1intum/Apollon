import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLActivityInitialNode } from '../../../../main/packages/uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node';
import { UMLActivityInitialNodeComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node-component';

it('render the uml-activity-intial-node-component', () => {
  const initialNode: UMLActivityInitialNode = new UMLActivityInitialNode({ name: 'TestActivityComponent' });
  const { container } = render(
    <svg>
      <UMLActivityInitialNodeComponent element={initialNode} />
    </svg>,
  );
  expect(container.querySelector('circle')).toBeInTheDocument();
});
