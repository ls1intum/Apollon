import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { UMLActivityMergeNode } from './uml-activity-merge-node';
import { ThemedPolyline } from '../../../components/theme/themedComponents';

export const UMLActivityMergeNodeComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
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
  fillColor?: string;
}
