import React, { FunctionComponent } from 'react';
import { Text } from '../../../components/controls/text/text';
import { UMLUseCaseActor } from './uml-use-case-actor';
import { ThemedCircle, ThemedLine } from '../../../components/theme/themedComponents';
import { computeDimension } from '../../../utils/geometry/boundary';

export const UMLUseCaseActorComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <rect width="100%" height="100%" fill="none" />
    <g stroke={element.strokeColor || 'black'} strokeWidth={2}>
      <ThemedCircle
        cx={computeDimension(1.0, 40, true)}
        cy={computeDimension(1.0, 25, true)}
        r={computeDimension(1.0, 15, true)}
        fillColor={fillColor || element.fillColor}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(1.0, 40)}
        y1={computeDimension(1.0, 40)}
        x2={computeDimension(1.0, 40)}
        y2={computeDimension(1.0, 75)}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(1.0, 10)}
        y1={50}
        x2={computeDimension(1.0, 65)}
        y2={50}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(1.0, 40)}
        y1={computeDimension(1.0, 75)}
        x2={computeDimension(1.0, 10)}
        y2={computeDimension(1.0, 110)}
        strokeColor={element.fillColor}
      />
      <ThemedLine
        x1={computeDimension(1.0, 40)}
        y1={computeDimension(1.0, 75)}
        x2={computeDimension(1.0, 65)}
        y2={computeDimension(1.0, 110)}
        strokeColor={element.fillColor}
      />
    </g>
    <Text fill={element.textColor} x={computeDimension(1.0, 40)} y={computeDimension(1.0, 130)}>
      {element.name}
    </Text>
  </g>
);

interface Props {
  element: UMLUseCaseActor;
  fillColor?: string;
}
