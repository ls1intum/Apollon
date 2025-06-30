import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SfcActionTable } from '../../../../../main/packages/sfc/sfc-action-table/sfc-action-table';
import { SfcActionTableComponent } from '../../../../../main/packages/sfc/sfc-action-table/sfc-action-table-component';

it('render the sfc-action-table-component', () => {
  const actionTable: SfcActionTable = new SfcActionTable();
  const { baseElement } = wrappedRender(
    <svg>
      <SfcActionTableComponent element={actionTable} />
    </svg>,
  );
  expect(baseElement).toMatchSnapshot();
});