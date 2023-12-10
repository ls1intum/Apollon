import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNDataObject } from '../../../../../main/packages/bpmn/bpmn-data-object/bpmn-data-object';
import { BPMNDataObjectComponent } from '../../../../../main/packages/bpmn/bpmn-data-object/bpmn-data-object-component';

it('render the bpmn-data-object-component', () => {
  const dataObject: BPMNDataObject = new BPMNDataObject({ name: 'Data Object' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNDataObjectComponent element={dataObject} />
    </svg>,
  );
  expect(getByText(dataObject.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
