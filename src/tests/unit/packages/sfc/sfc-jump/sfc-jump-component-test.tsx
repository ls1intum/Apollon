import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcJump } from '../../../../../main/packages/sfc/sfc-jump/sfc-jump';
import { SfcJumpComponent } from '../../../../../main/packages/sfc/sfc-jump/sfc-jump-component';

it('render the sfc-jump-component', () => {
  const jump: SfcJump = new SfcJump({ name: 'Jump' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SfcJumpComponent element={jump} />
    </svg>,
  );
  expect(getByText(jump.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
