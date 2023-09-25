import React, { FunctionComponent } from 'react';
import { BPMNAnnotation } from './bpmn-annotation';
import { ThemedPath, ThemedPolyline, ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNAnnotationComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width={element.bounds.width}
      height={element.bounds.height}
      strokeColor="transparent"
      fillColor="transparent"
    />
    <ThemedPath
      d={`M20,0 L10,0 A 10 10 280 0 0 0 10 L0,${element.bounds.height - 10} A 10 10 180 0 0 10 ${
        element.bounds.height
      } L20, ${element.bounds.height}`}
      strokeColor={element.strokeColor}
      fillColor="transparent"
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={element.textColor}
      lineHeight={16}
      capHeight={11}
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: BPMNAnnotation;
  fillColor?: string;
}
