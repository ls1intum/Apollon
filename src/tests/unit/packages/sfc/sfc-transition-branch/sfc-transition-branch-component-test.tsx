import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcTransitionBranch } from '../../../../../main/packages/sfc/sfc-transition-branch/sfc-transition-branch';
import { SfcTransitionBranchComponent } from '../../../../../main/packages/sfc/sfc-transition-branch/sfc-transition-branch-component';

it('render the sfc-transition-branch-component', () => {
  const transitionBranch: SfcTransitionBranch = new SfcTransitionBranch({
    name: 'TransitionBranch',
    bounds: {
      x: -1_000_000_000_000,
    },
  });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SfcTransitionBranchComponent element={transitionBranch} />
    </svg>,
  );
  expect(getByText(transitionBranch.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});