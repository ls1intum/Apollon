import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNCallActivity } from '../../../../../main/packages/bpmn/bpmn-call-activity/bpmn-call-activity';
import { BPMNCallActivityComponent } from '../../../../../main/packages/bpmn/bpmn-call-activity/bpmn-call-activity-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-call-activity-component', () => {
  const callActivity: BPMNCallActivity = new BPMNCallActivity({ name: 'Call Activity' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNCallActivityComponent element={callActivity} />
    </svg>,
  );
  expect(getByText(callActivity.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
