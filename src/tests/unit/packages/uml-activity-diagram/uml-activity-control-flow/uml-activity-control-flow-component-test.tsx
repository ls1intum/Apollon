import * as React from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { UMLActivityControlFlow } from '../../../../../main/packages/uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow';
import { UMLActivityControlFlowComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity-control-flow/uml-activity-control-flow-component';

it('render the uml-activity-control-flow-component', () => {
  const controlFlow: UMLActivityControlFlow = new UMLActivityControlFlow({
    id: 'd37b8ce3-17d2-4432-8fff-6c38ff2a1334',
    name: 'TestActivityComponent',
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLActivityControlFlowComponent element={controlFlow} />
    </svg>,
  );
  expect(getByText(controlFlow.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
