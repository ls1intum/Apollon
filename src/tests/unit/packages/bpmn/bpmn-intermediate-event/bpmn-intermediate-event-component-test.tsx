import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { SyntaxTreeTerminal } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal';
import { SyntaxTreeTerminalComponent } from '../../../../../main/packages/syntax-tree/syntax-tree-terminal/syntax-tree-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';
import { BPMNIntermediateEvent } from '../../../../../main/packages/bpmn/bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNIntermediateEventComponent } from '../../../../../main/packages/bpmn/bpmn-intermediate-event/bpmn-intermediate-event-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-intermediate-event-component', () => {
  const intermediateEvent: BPMNIntermediateEvent = new BPMNIntermediateEvent({ name: 'Event' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNIntermediateEventComponent element={intermediateEvent} />
    </svg>,
  );
  expect(getByText(intermediateEvent.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
