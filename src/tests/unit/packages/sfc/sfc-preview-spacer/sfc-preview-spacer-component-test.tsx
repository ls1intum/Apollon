import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcPreviewSpacer } from '../../../../../main/packages/sfc/sfc-preview-spacer/sfc-preview-spacer';
import { SfcPreviewSpacerComponent } from '../../../../../main/packages/sfc/sfc-preview-spacer/sfc-preview-spacer-component';

it('render the sfc-preview-spacer-component', () => {
  const spacer = new SfcPreviewSpacer();
  const { baseElement } = wrappedRender(
    <svg>
      <SfcPreviewSpacerComponent element={spacer} />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
