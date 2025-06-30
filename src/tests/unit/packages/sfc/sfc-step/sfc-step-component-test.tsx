import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcStep } from '../../../../../main/packages/sfc/sfc-step/sfc-step';
import { SfcStepComponent } from '../../../../../main/packages/sfc/sfc-step/sfc-step-component';

it('render the sfc-step-component', () => {
  const step: SfcStep = new SfcStep({ name: 'Step' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <SfcStepComponent element={step} />
    </svg>,
  );
  expect(getByText(step.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
