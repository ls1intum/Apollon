import React, { SFC } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { UMLActivityActionNode } from './uml-activity-action-node';

export const UMLActivityActionNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke={element.strokeColor || 'black'} />
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
}
