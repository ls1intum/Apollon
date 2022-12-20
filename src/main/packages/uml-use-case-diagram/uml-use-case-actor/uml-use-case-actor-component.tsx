import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseActor } from './uml-use-case-actor';
import { ThemedCircle, ThemedLine } from '../../../components/theme/themedComponents';

export const UMLUseCaseActorComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <rect width="100%" height="100%" fill="none" />
    <g stroke={element.strokeColor || 'black'} strokeWidth={2}>
      <ThemedCircle
        cx={45 * scale}
        cy={25 * scale}
        r={12.5 * scale}
        fillColor={fillColor || element.fillColor}
        strokeColor={element.fillColor}
      />
      <ThemedLine x1={45 * scale} y1={37.5 * scale} x2={45 * scale} y2={80 * scale} strokeColor={element.fillColor} />
      <ThemedLine x1={12.5 * scale} y1={50 * scale} x2={75 * scale} y2={50 * scale} strokeColor={element.fillColor} />
      <ThemedLine
        x1={45 * scale}
        y1={80 * scale}
        x2={12.5 * scale}
        y2={112.5 * scale}
        strokeColor={element.fillColor}
      />
      <ThemedLine x1={45 * scale} y1={80 * scale} x2={75 * scale} y2={112.5 * scale} strokeColor={element.fillColor} />
    </g>
    <Text fill={element.textColor} x={45 * scale} y={130 * scale}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLUseCaseActor;
  scale: number;
  fillColor?: string;
}
