import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartInputOutput } from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output';
import { FlowchartInputOutputComponent } from '../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output-component';
import { Multiline } from '../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-input-output-component', () => {
  const inputOutput: FlowchartInputOutput = new FlowchartInputOutput({ name: 'TestInputOutputComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartInputOutputComponent element={inputOutput} scale={1.0} />
    </svg>,
  );
  expect(getByText(inputOutput.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
