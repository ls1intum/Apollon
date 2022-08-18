import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ColorLegend } from './color-legend';
import { ThemedPath } from '../../../components/theme/themedComponents';

export const ColorLegendComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedPath
      d={`M 0 0 L ${element.bounds.width - 15} 0 L ${element.bounds.width} 15 L ${element.bounds.width} ${
        element.bounds.height
      } L 0 ${element.bounds.height} L 0 0 Z`}
      fillColor={fillColor || element.fillColor}
      strokeColor={element.strokeColor}
      strokeWidth="1.2"
      strokeMiterlimit="10"
    />
    <ThemedPath
      d={`M ${element.bounds.width - 15} 0 L ${element.bounds.width - 15} 15 L ${element.bounds.width} 15`}
      fillColor="none"
      strokeColor={element.strokeColor}
      strokeWidth="1.2"
      strokeMiterlimit="10"
    />
    {/* <rect width="100%" height="100%" stroke={element.strokeColor || 'black'} /> */}
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

export interface Props {
  element: ColorLegend;
  fillColor?: string;
}
