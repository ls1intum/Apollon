import * as React from 'react';
import { CSSProperties } from 'react';
import { UMLActivityMergeNode } from '../../../../../main/packages/uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node';
import { UMLActivityMergeNodeComponent } from '../../../../../main/packages/uml-activity-diagram/uml-activity-merge-node/uml-activity-merge-node-component';
import { Multiline } from '../../../../../main/utils/svg/multiline';
import { wrappedRender } from '../../../test-utils/render';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

it('render the uml-activity-merge-node-component', () => {
  const mergeNode: UMLActivityMergeNode = new UMLActivityMergeNode({ name: 'TestActivityComponent' });
  const { getByText, baseElement } = wrappedRender(
    <svg>
      <UMLActivityMergeNodeComponent element={mergeNode} />
    </svg>,
  );
  expect(getByText(mergeNode.name)).toBeInTheDocument();
  expect(baseElement).toMatchSnapshot();
});
