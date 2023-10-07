import React, { FunctionComponent } from 'react';
import { ThemedPolyline } from '../../../../components/theme/themedComponents';
import { Multiline } from '../../../../utils/svg/multiline';
import { Props } from '../bpmn-gateway-component';

export const BPMNExclusiveGatewayComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPolyline
      points={`13 13, ${element.bounds.width - 13} ${element.bounds.height - 13}`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPolyline
      points={`13 ${element.bounds.height - 13}, ${element.bounds.width - 13} 13`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <Multiline
      x={element.bounds.width + 10}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fill={element.textColor}
      lineHeight={16}
      capHeight={11}
      textAnchor="start"
    >
      {element.name}
    </Multiline>
  </g>
);
