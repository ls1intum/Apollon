import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNUserIcon } from '../../../../../main/packages/bpmn/common/bpmn-user-icon';

it('render the bpmn-user-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNUserIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
