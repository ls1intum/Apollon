import * as React from 'react';
import { getRealStore } from '../../../test-utils/test-utils';
import { UMLElement } from '../../../../../main/services/uml-element/uml-element';
import { wrappedRender } from '../../../test-utils/render';
import { act, fireEvent } from '@testing-library/react';
import { SfcActionTable } from '../../../../../main/packages/sfc/sfc-action-table/sfc-action-table';
import { SfcActionTableUpdate } from '../../../../../main/packages/sfc/sfc-action-table/sfc-action-table-update';
import { SfcActionTableRow } from '../../../../../main/packages/sfc/sfc-action-table/sfc-action-table-row/sfc-action-table-row';

describe('test sfc action table update', () => {
  let elements: UMLElement[] = [];
  let actionTable: SfcActionTable;
  let actionTableRow: SfcActionTableRow;

  beforeEach(() => {
    actionTable = new SfcActionTable({ id: 'action-table-test-id' });
    actionTableRow = new SfcActionTableRow({
      id: 'action-table-row-test-id',
      name: JSON.stringify(['A', 'Action']),
      owner: actionTable.id,
    });
    actionTable.ownedElements = [actionTableRow.id];
    elements = [actionTable, actionTableRow];
  });

  it('render', () => {
    const store = getRealStore(undefined, elements);

    const { baseElement } = wrappedRender(<SfcActionTableUpdate element={actionTable} />, { store });
    expect(baseElement).toMatchSnapshot();
  });

  it('rename row', () => {
    const store = getRealStore(undefined, elements);

    const { getAllByRole } = wrappedRender(<SfcActionTableUpdate element={actionTable} />, { store });
    const textboxes = getAllByRole('textbox');
    const newValue = 'Updated Action';

    act(() => {
      fireEvent.change(textboxes[1], { target: { value: newValue } });
    });

    const updatedRow = store.getState().elements[actionTableRow.id] as SfcActionTableRow;
    const parsedValues = JSON.parse(updatedRow.name);

    expect(parsedValues[1]).toEqual(newValue);
  });
});
