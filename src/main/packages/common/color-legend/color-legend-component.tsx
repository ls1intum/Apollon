import React, { FunctionComponent } from 'react';
import { Multiline } from '../../../utils/svg/multiline';
import { ColorLegend } from './color-legend';

export const ColorLegendComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <path
      d={`M 0 0 L ${element.bounds.width - 15} 0 L ${element.bounds.width} 15 L ${element.bounds.width} ${
        element.bounds.height
      } L 0 ${element.bounds.height} L 0 0 Z`}
      fill={element.fillColor || '#ffffff'}
      stroke={element.strokeColor || 'black'}
      strokeWidth="1.2"
      strokeMiterlimit="10"
    />
    <path
      d={`M ${element.bounds.width - 15} 0 L ${element.bounds.width - 15} 15 L ${element.bounds.width} 15`}
      fill="none"
      stroke={element.strokeColor || 'black'}
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
}
