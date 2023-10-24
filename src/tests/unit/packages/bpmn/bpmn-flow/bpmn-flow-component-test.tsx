import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNFlow } from '../../../../../main/packages/bpmn/bpmn-flow/bpmn-flow';
import { BPMNFlowComponent } from '../../../../../main/packages/bpmn/bpmn-flow/bpmn-flow-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

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
