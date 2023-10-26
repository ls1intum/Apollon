import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNGroup } from '../../../../../main/packages/bpmn/bpmn-group/bpmn-group';
import { BPMNGroupComponent } from '../../../../../main/packages/bpmn/bpmn-group/bpmn-group-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-group-component', () => {
  const group: BPMNGroup = new BPMNGroup({ name: 'Group' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNGroupComponent element={group} />
    </svg>,
  );
  expect(getByText(group.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
