import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLPetriNetTransition } from './uml-petri-net-transition';
import { ThemedRect } from '../../../components/theme/themedComponents';

export const UMLPetriNetTransitionComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <Text y={-15 * scale} fill={element.textColor}>
      {element.name}
    </Text>
    <ThemedRect
      width={element.bounds.width}
      height={element.bounds.height}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
      strokeWidth={1.2 * scale}
      fillOpacity={1}
    />
  </g>
);

interface Props {
  element: UMLPetriNetTransition;
  scale: number;
  fillColor?: string;
}
