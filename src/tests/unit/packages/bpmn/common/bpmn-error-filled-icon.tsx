import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNErrorFilledIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-error-filled-icon';

it('render the bpmn-error-filled-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNErrorFilledIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
