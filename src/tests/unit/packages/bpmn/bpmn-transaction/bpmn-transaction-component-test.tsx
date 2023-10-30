import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { BPMNTransaction } from '../../../../../main/packages/bpmn/bpmn-transaction/bpmn-transaction';
import { BPMNTransactionComponent } from '../../../../../main/packages/bpmn/bpmn-transaction/bpmn-transaction-component';

it('render the bpmn-transaction-component', () => {
  const transaction: BPMNTransaction = new BPMNTransaction({ name: 'Transaction' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNTransactionComponent element={transaction} />
    </svg>,
  );
  expect(getByText(transaction.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
