import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNGateway } from '../../../../../main/packages/bpmn/bpmn-gateway/bpmn-gateway';
import { BPMNGatewayComponent } from '../../../../../main/packages/bpmn/bpmn-gateway/bpmn-gateway-component';

it('render the bpmn-gateway-component', () => {
  const gateway: BPMNGateway = new BPMNGateway({ name: 'Gateway' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNGatewayComponent element={gateway} />
    </svg>,
  );
  expect(getByText(gateway.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
