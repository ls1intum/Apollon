import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNPool } from '../../../../../main/packages/bpmn/bpmn-pool/bpmn-pool';
import { BPMNPoolComponent } from '../../../../../main/packages/bpmn/bpmn-pool/bpmn-pool-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-pool-component', () => {
  const pool: BPMNPool = new BPMNPool({ name: 'Pool' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNPoolComponent element={pool} />
    </svg>,
  );
  expect(getByText(pool.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
