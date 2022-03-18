import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartDecision } from '../../../../../main/packages/flowchart/flowchart-decision/flowchart-decision';
import { FlowchartDecisionComponent } from '../../../../../main/packages/flowchart/flowchart-decision/flowchart-decision-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { CSSProperties } from 'react';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the flowchart-decision-component', () => {
  const decision: FlowchartDecision = new FlowchartDecision({ name: 'TestDecisionComponent' });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartDecisionComponent element={decision} scale={1.0} />
    </svg>,
  );
  expect(getByText(decision.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
