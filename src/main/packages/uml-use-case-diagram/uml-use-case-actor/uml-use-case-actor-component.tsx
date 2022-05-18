import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseActor } from './uml-use-case-actor';
import { ThemedCircle, ThemedLine } from '../../../components/theme/themedComponents';

export const UMLUseCaseActorComponent: FunctionComponent<Props> = ({ element, scale }) => (
  <g>
    <rect width="100%" height="100%" fill="none" />
    <g stroke={element.strokeColor || 'black'} strokeWidth={2}>
      <ThemedCircle
        cx={45 * scale}
        cy={25 * scale}
        r={15 * scale}
        fillColor={element.fillColor}
        strokeColor={element.fillColor}
      />
      <ThemedLine x1={45 * scale} y1={40 * scale} x2={45 * scale} y2={80 * scale} strokeColor={element.fillColor} />
      <ThemedLine x1={15 * scale} y1={55 * scale} x2={75 * scale} y2={55 * scale} strokeColor={element.fillColor} />
      <ThemedLine x1={45 * scale} y1={80 * scale} x2={15 * scale} y2={110 * scale} strokeColor={element.fillColor} />
      <ThemedLine x1={45 * scale} y1={80 * scale} x2={75 * scale} y2={110 * scale} strokeColor={element.fillColor} />
    </g>
    <Text fill={element.textColor} x={45 * scale} y={130 * scale}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLUseCaseActor;
  scale: number;
}
