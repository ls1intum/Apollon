import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNMessageFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-message-filled-icon';

it('render the bpmn-message-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNMessageFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
