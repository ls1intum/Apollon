import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNScriptIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-script-icon';

it('render the bpmn-script-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNScriptIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
