import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLActivityControlFlow } from '../../../../main/packages/uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow';
import { UMLActivityControlFlowComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-component';

it('render the uml-activity-control-flow-component', () => {
  const controlFlow: UMLActivityControlFlow = new UMLActivityControlFlow({ name: 'TestActivityComponent' });
  const { getByText } = render(
    <svg>
      <UMLActivityControlFlowComponent element={controlFlow} />
    </svg>,
  );
  expect(getByText(controlFlow.name)).toBeInTheDocument();
});
