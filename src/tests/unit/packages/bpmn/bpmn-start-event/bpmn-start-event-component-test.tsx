import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNStartEvent } from '../../../../../main/packages/bpmn/bpmn-start-event/bpmn-start-event';
import { BPMNStartEventComponent } from '../../../../../main/packages/bpmn/bpmn-start-event/bpmn-start-event-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-start-event-component', () => {
  const startEvent: BPMNStartEvent = new BPMNStartEvent({ name: 'Start' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNStartEventComponent element={startEvent} />
    </svg>,
  );
  expect(getByText(startEvent.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
