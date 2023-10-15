import * as React from 'react';
import { UMLActivityFinalNode } from '../../../../../main/packages/uml-activity-diagram/uml-activity-final-node/uml-activity-final-node';
import { UMLActivityFinalNodeComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity-final-node/uml-activity-final-node-component';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';

it('render the uml-activity-final-node-component', () => {
  const finalNode: UMLActivityFinalNode = new UMLActivityFinalNode({ name: 'TestActivityComponent' });
  const store = getRealStore(undefined, [finalNode]);
  const { container, baseElement } = wrappedRender(
    <svg>
      <UMLActivityFinalNodeComponent element={finalNode} />
    </svg>,
    { store },
  );
  expect(container.querySelector('circle')).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
