import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNDataObject } from './bpmn-data-object';

export const BPMNDataObjectComponent: FunctionComponent<Props> = ({ element, fillColor, strokeColor, textColor }) => (
  <g>
    <ThemedPolyline
      points={`0 0, 0 ${element.bounds.height}, ${element.bounds.width} ${element.bounds.height}, ${
        element.bounds.width
      } 15, ${element.bounds.width - 15} 0, ${element.bounds.width - 15} 15, ${element.bounds.width} 15, ${
        element.bounds.width - 15
      } 0, 0 0`}
      strokeColor={strokeColor || element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height + 20}
      width={element.bounds.width * 2}
      fill={textColor || element.textColor}
      lineHeight={16}
      capHeight={11}
      verticalAnchor="start"
    >
      {element.name}
    </Multiline>
  </g>
);

interface Props {
  element: BPMNDataObject;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
