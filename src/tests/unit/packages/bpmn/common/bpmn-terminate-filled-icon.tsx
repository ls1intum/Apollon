import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNTerminateFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-terminate-filled-icon';

it('render the bpmn-terminate-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNTerminateFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
