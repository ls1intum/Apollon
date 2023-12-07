import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNConditionalIcon } from '../../../../../main/packages/bpmn/common/icons/bpmn-conditional-icon';

it('render the bpmn-conditional-icon', () => {
  const { baseElement } = wrappedRender(
    <svg>
      <BPMNConditionalIcon />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
