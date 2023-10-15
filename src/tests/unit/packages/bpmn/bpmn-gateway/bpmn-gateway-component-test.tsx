import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
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
