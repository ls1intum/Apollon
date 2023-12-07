import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNDataStoreComponent } from '../../../../../main/packages/bpmn/bpmn-data-store/bpmn-data-store-component';
import { BPMNDataStore } from '../../../../../main/packages/bpmn/bpmn-data-store/bpmn-data-store';

it('render the bpmn-data-store-component', () => {
  const dataStore: BPMNDataStore = new BPMNDataStore({ name: 'Data Store' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNDataStoreComponent element={dataStore} />
    </svg>,
  );
  expect(getByText(dataStore.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
