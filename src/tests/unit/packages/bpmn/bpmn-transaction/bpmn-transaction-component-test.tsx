import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNTransaction } from '../../../../../main/packages/bpmn/bpmn-transaction/bpmn-transaction';
import { BPMNTransactionComponent } from '../../../../../main/packages/bpmn/bpmn-transaction/bpmn-transaction-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

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
