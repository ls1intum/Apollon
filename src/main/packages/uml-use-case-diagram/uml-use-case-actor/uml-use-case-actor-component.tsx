import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseActor } from './uml-use-case-actor';
import { ThemedCircle, ThemedLine } from '../../../components/theme/themedComponents';
import { computeDimension } from '../../../utils/geometry/boundary';

export const UMLUseCaseActorComponent: FunctionComponent<Props> = ({ element, scale, fillColor }) => (
  <g>
    <rect width="100%" height="100%" fill="none" />
    <g stroke={element.strokeColor || 'black'} strokeWidth={2}>
      <ThemedCircle
        cx={computeDimension(scale, 40, true)}
        cy={computeDimension(scale, 25, true)}
        r={computeDimension(scale, 15, true)}
        fillColor={fillColor || element.fillColor}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(scale, 40)}
        y1={computeDimension(scale, 40)}
        x2={computeDimension(scale, 40)}
        y2={computeDimension(scale, 75)}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(scale, 10)}
        y1={50 * scale}
        x2={computeDimension(scale, 65)}
        y2={50 * scale}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(scale, 40)}
        y1={computeDimension(scale, 75)}
        x2={computeDimension(scale, 10)}
        y2={computeDimension(scale, 110)}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(scale, 40)}
        y1={computeDimension(scale, 75)}
        x2={computeDimension(scale, 65)}
        y2={computeDimension(scale, 110)}
        strokeColor={element.fillColor}
      />
    </g>
    <Text fill={element.textColor} x={computeDimension(scale, 40)} y={computeDimension(scale, 130)}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLUseCaseActor;
  scale: number;
  fillColor?: string;
}
