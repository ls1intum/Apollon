import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartProcess } from '../../../../main/packages/flowchart/flowchart-process/flowchart-process';
import { FlowchartProcessComponent } from '../../../../main/packages/flowchart/flowchart-process/flowchart-process-component';
import { Multiline } from '../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-process-component', () => {
  const process: FlowchartProcess = new FlowchartProcess({ name: 'TestProcessComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartProcessComponent element={process} scale={1.0} />
    </svg>,
  );
  expect(getByText(process.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
