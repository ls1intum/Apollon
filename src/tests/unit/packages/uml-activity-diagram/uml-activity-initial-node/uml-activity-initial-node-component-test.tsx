import * as React from 'react';
import { UMLActivityInitialNode } from '../../../../../main/packages/uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node';
import { UMLActivityInitialNodeComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity-initial-node/uml-activity-initial-node-component';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';

it('render the uml-activity-intial-node-component', () => {
  const initialNode: UMLActivityInitialNode = new UMLActivityInitialNode({ name: 'TestActivityComponent' });
  const store = getRealStore(undefined, [initialNode]);
  const { container, baseElement } = wrappedRender(
    <svg>
      <UMLActivityInitialNodeComponent element={initialNode} />
    </svg>,
    { store },
  );
  expect(container.querySelector('circle')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
