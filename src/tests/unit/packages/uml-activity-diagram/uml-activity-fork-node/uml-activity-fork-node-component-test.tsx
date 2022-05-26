import * as React from 'react';
import { UMLActivityForkNode } from '../../../../../main/packages/uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node';
import { UMLActivityForkNodeComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity-fork-node/uml-activity-fork-node-component';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';

it('render the uml-activity-fork-node-component', () => {
  const forkNode: UMLActivityForkNode = new UMLActivityForkNode({ name: 'TestActivityComponent' });
  const store = getRealStore(undefined, [forkNode]);
  const { container, baseElement } = wrappedRender(
    <svg>
      <UMLActivityForkNodeComponent element={forkNode} />
    </svg>,
    { store },
  );
  expect(container.querySelector('rect')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
