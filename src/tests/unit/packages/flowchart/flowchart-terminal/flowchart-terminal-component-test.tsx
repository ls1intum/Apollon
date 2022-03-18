import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartTerminal } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal';
import { FlowchartTerminalComponent } from '../../../../../main/packages/flowchart/flowchart-terminal/flowchart-terminal-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-terminal-component', () => {
  const terminal: FlowchartTerminal = new FlowchartTerminal({ name: 'TestTerminalComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartTerminalComponent element={terminal} scale={1.0} />
    </svg>,
  );
  expect(getByText(terminal.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
