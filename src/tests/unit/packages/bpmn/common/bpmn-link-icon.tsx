import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNLinkIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-link-icon';

it('render the bpmn-link-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNLinkIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
