import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLActivityFinalNode } from '../../../../main/packages/uml-activity-diagram/uml-activity-final-node/uml-activity-final-node';
import { UMLActivityFinalNodeComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity-final-node/uml-activity-final-node-component';

it('render the uml-activity-final-node-component', () => {
  const finalNode: UMLActivityFinalNode = new UMLActivityFinalNode({ name: 'TestActivityComponent' });
  const { container } = render(
    <svg>
      <UMLActivityFinalNodeComponent element={finalNode} />
    </svg>,
  );
  expect(container.querySelector('circle')).toBeInTheDocument();
});
