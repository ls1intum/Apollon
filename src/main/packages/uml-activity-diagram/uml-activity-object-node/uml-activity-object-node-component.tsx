import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline.js';
import { UMLActivityObjectNode } from './uml-activity-object-node.js';

export const UMLActivityObjectNodeComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: UMLActivityObjectNode;
}
