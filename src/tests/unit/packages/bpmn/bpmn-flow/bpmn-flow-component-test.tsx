import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNFlow } from '../../../../../main/packages/bpmn/bpmn-flow/bpmn-flow';
import { BPMNFlowComponent } from '../../../../../main/packages/bpmn/bpmn-flow/bpmn-flow-component';

it('render the bpmn-flow-component', () => {
  const flow: BPMNFlow = new BPMNFlow({ id: '1', name: 'Sequence' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNFlowComponent element={flow} />
    </svg>,
  );
  expect(getByText(flow.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
