import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNCallActivity } from '../../../../../main/packages/bpmn/bpmn-call-activity/bpmn-call-activity';
import { BPMNCallActivityComponent } from '../../../../../main/packages/bpmn/bpmn-call-activity/bpmn-call-activity-component';

it('render the bpmn-call-activity-component', () => {
  const callActivity: BPMNCallActivity = new BPMNCallActivity({ name: 'Call Activity' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNCallActivityComponent element={callActivity} />
    </svg>,
  );
  expect(getByText(callActivity.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
