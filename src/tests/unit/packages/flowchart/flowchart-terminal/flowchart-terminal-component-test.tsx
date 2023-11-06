import * as React from 'react';
import { CSSProperties } from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { FlowchartTerminal } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import { FlowchartTerminalComponent } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-terminal-component', () => {
  const terminal: FlowchartTerminal = new FlowchartTerminal({ name: 'TestTerminalComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <FlowchartTerminalComponent element={terminal} />
    </svg>,
  );
  expect(getByText(terminal.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
