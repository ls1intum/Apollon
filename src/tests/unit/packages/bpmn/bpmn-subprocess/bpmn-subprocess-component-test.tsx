import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNSubprocess } from '../../../../../main/packages/bpmn/bpmn-subprocess/bpmn-subprocess';
import { BPMNSubprocessComponent } from '../../../../../main/packages/bpmn/bpmn-subprocess/bpmn-subprocess-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-subprocess-component', () => {
  const subprocess: BPMNSubprocess = new BPMNSubprocess({ name: 'SyntaxTreeTerminal' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNSubprocessComponent element={subprocess} />
    </svg>,
  );
  expect(getByText(subprocess.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
