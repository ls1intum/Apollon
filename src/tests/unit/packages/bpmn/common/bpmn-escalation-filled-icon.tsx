import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNEscalationFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-escalation-filled-icon';

it('render the bpmn-escalation-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNEscalationFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
