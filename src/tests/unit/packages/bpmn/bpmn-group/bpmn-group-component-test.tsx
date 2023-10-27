import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNGroup } from '../../../../../main/packages/bpmn/bpmn-group/bpmn-group';
import { BPMNGroupComponent } from '../../../../../main/packages/bpmn/bpmn-group/bpmn-group-component';

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
