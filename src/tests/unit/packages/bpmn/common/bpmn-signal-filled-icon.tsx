import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNSignalFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-signal-filled-icon';

it('render the bpmn-signal-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNSignalFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
