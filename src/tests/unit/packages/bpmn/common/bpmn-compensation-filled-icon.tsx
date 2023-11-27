import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNCompensationFilledIcon } from '../../../../../main/packages/bpmn/common/bpmn-compensation-filled-icon';

it('render the bpmn-compensation-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNCompensationFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
