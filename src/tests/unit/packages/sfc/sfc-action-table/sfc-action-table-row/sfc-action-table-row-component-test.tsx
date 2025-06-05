import * as React from 'react';
import { wrappedRender } from '../../../../test-utils/render';
import { SfcActionTableRow } from '../../../../../../main/packages/sfc/sfc-action-table/sfc-action-table-row/sfc-action-table-row';
import { SfcActionTableRowComponent } from '../../../../../../main/packages/sfc/sfc-action-table/sfc-action-table-row/sfc-action-table-row-component';

it('render the sfc-action-table-row-component', () => {
  const actionTableRow: SfcActionTableRow = new SfcActionTableRow({
    name: JSON.stringify(['A', 'Action']),
  });
  const { baseElement } = wrappedRender(
    <svg>
      <SfcActionTableRowComponent element={actionTableRow} />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});
