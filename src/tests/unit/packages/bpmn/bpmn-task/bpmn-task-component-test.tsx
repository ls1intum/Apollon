import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNTask } from '../../../../../main/packages/bpmn/bpmn-task/bpmn-task';
import { BPMNTaskComponent } from '../../../../../main/packages/bpmn/bpmn-task/bpmn-task-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-task-component', () => {
  const task: BPMNTask = new BPMNTask({ name: 'Task' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNTaskComponent element={task} />
    </svg>,
  );
  expect(getByText(task.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
