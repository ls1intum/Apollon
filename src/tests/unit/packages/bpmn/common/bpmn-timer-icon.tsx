import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNTimerIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-timer-icon';

it('render the bpmn-timer-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNTimerIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
