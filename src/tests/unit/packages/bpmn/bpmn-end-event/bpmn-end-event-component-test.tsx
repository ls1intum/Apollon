import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNEndEventComponent } from '../../../../../main/packages/bpmn/bpmn-end-event/bpmn-end-event-component';
import { BPMNEndEvent } from '../../../../../main/packages/bpmn/bpmn-end-event/bpmn-end-event';

it('render the bpmn-end-event-component', () => {
  const endEvent: BPMNEndEvent = new BPMNEndEvent({ name: 'End' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNEndEventComponent element={endEvent} />
    </svg>,
  );
  expect(getByText(endEvent.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
