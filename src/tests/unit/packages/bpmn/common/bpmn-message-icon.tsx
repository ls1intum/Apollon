import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNMessageIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-message-icon';

it('render the bpmn-message-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNMessageIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
