import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartFunctionCall } from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call';
import { FlowchartFunctionCallComponent } from '../../../../main/packages/flowchart/flowchart-function-call/flowchart-function-call-component';
import { Multiline } from '../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-function-call-component', () => {
  const functionCall: FlowchartFunctionCall = new FlowchartFunctionCall({ name: 'TestFunctionCallComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartFunctionCallComponent element={functionCall} scale={1.0} />
    </svg>,
  );
  expect(getByText(functionCall.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
