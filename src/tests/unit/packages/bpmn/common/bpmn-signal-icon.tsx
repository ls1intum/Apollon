import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNSignalIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-signal-icon';

it('render the bpmn-signal-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNSignalIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
