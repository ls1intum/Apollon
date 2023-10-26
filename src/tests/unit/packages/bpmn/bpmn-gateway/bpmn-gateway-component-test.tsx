import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNGateway } from '../../../../../main/packages/bpmn/bpmn-gateway/bpmn-gateway';
import { BPMNGatewayComponent } from '../../../../../main/packages/bpmn/bpmn-gateway/bpmn-gateway-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

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
