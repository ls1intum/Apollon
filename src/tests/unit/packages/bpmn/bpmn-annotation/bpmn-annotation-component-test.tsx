import { wrappedRender } from '../../../test-utils/render';
import * as React from 'react';
import { CSSProperties } from 'react';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { BPMNAnnotation } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation';
import { BPMNAnnotationComponent } from '../../../../../main/packages/bpmn/bpmn-annotation/bpmn-annotation-component';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the bpmn-annotation-component', () => {
  const annotation: BPMNAnnotation = new BPMNAnnotation({ name: 'Annotation' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <BPMNAnnotationComponent element={annotation} />
    </svg>,
  );
  expect(getByText(annotation.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
