import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline.js';
import { UMLActivityActionNode } from './uml-activity-action-node.js';

export const UMLActivityActionNodeComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <rect rx={10 * scale} ry={10 * scale} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
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
  element: UMLActivityActionNode;
  scale: number;
}
