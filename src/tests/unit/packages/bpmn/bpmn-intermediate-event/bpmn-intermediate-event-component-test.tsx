import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNIntermediateEvent } from '../../../../../main/packages/bpmn/bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNIntermediateEventComponent } from '../../../../../main/packages/bpmn/bpmn-intermediate-event/bpmn-intermediate-event-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-intermediate-event-component', () => {
  const intermediateEvent: BPMNIntermediateEvent = new BPMNIntermediateEvent({ name: 'Event' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNIntermediateEventComponent element={intermediateEvent} />
    </svg>,
  );
  expect(getByText(intermediateEvent.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
