import * as React from 'react';
import { render } from '@testing-library/react';
import { UMLActivityObjectNode } from '../../../../main/packages/uml-activity-diagram/uml-activity-object-node/uml-activity-object-node';
import { UMLActivityObjectNodeComponent } from '../../../../main/packages/uml-activity-diagram/uml-activity-object-node/uml-activity-object-node-component';
import { Multiline } from "../../../../main/utils/svg/multiline";
import { CSSProperties } from "react";

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

describe('test', () => {
  it('render the uml-activity-object-node-component', () => {
    const objectNode: UMLActivityObjectNode = new UMLActivityObjectNode({ name: 'TestActivityComponent' });
    const { getByText } = render(
      <svg>
        <UMLActivityObjectNodeComponent element={objectNode} />
      </svg>,
    );
    expect(getByText(objectNode.name)).toBeInTheDocument();
  });
});
