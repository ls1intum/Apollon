import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline.js';
import { UMLActivityMergeNode } from './uml-activity-merge-node.js';

export const UMLActivityMergeNodeComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <polyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      stroke={element.strokeColor || 'black'}
    />
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
  element: UMLActivityMergeNode;
}
