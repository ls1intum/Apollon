import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcTransition } from '../../../../../main/packages/sfc/sfc-transition/sfc-transition';
import { SfcTransitionComponent } from '../../../../../main/packages/sfc/sfc-transition/sfc-transition-component';
import { Point } from '../../../../../main/utils/geometry/point';

it('render the sfc-transition-component', () => {
  const transition: SfcTransition = new SfcTransition({
    name: JSON.stringify({ isNegated: false, displayName: 'Transition' }),
    path: [new Point(0, 0), new Point(100, 100)],
  });
  const { baseElement } = wrappedRender(
    <svg>
      <SfcTransitionComponent element={transition} />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
