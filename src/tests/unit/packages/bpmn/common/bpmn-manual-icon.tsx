import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNManualIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-manual-icon';

it('render the bpmn-manual-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNManualIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
