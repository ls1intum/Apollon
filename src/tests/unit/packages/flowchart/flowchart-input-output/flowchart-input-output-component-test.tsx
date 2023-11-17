import * as React from 'react';
import { CSSProperties } from 'react';
import { wrappedRender } from '../../../test-utils/render';
import { FlowchartInputOutput } from '../../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output';
import { FlowchartInputOutputComponent } from '../../../../../main/packages/flowchart/flowchart-input-output/flowchart-input-output-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-input-output-component', () => {
  const inputOutput: FlowchartInputOutput = new FlowchartInputOutput({ name: 'TestInputOutputComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <FlowchartInputOutputComponent element={inputOutput} />
    </svg>,
  );
  expect(getByText(inputOutput.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
