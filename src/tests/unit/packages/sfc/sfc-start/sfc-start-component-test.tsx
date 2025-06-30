import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcStart } from '../../../../../main/packages/sfc/sfc-start/sfc-start';
import { SfcStartComponent } from '../../../../../main/packages/sfc/sfc-start/sfc-start-component';

it('render the sfc-start-component', () => {
  const start: SfcStart = new SfcStart({ name: 'Start' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SfcStartComponent element={start} />
    </svg>,
  );
  expect(getByText(start.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
