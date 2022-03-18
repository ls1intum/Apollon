import * as React from 'react';
import { render } from '@testing-library/react';
import { FlowchartFlowline } from '../../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline';
import { FlowchartFlowlineComponent } from '../../../../../main/packages/flowchart/flowchart-flowline/flowchart-flowline-component';

it('render the flowchart-flowline-component', () => {
  const flowline: FlowchartFlowline = new FlowchartFlowline({
    id: 'd37b8ce3-17d2-4432-8fff-6c38ff2a1334',
    name: 'TestFlowchartComponent',
  });
  const { getByText, baseElement } = render(
    <svg>
      <FlowchartFlowlineComponent element={flowline} />
    </svg>,
  );
  expect(getByText(flowline.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
