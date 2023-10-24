import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNSwimlane } from '../../../../../main/packages/bpmn/bpmn-swimlane/bpmn-swimlane';
import { BPMNSwimlaneComponent } from '../../../../../main/packages/bpmn/bpmn-swimlane/bpmn-swimlane-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-swimlane-component', () => {
  const swimlane: BPMNSwimlane = new BPMNSwimlane({ name: 'Swimlane' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNSwimlaneComponent element={swimlane} />
    </svg>,
  );
  expect(getByText(swimlane.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
