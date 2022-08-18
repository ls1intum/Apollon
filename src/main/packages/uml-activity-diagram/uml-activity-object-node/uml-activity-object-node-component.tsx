import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { UMLActivityObjectNode } from './uml-activity-object-node';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLActivityObjectNodeComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedRect
      width="100%"
      height="100%"
      fillColor={fillColor || element.fillColor}
      strokeColor={element.strokeColor}
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
  element: UMLActivityObjectNode;
  fillColor?: string;
}
