import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNLinkFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-link-filled-icon';

it('render the bpmn-link-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNLinkFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
