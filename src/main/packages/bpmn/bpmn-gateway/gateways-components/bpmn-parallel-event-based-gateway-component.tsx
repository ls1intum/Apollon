import React, { FunctionComponent } from 'react';
import { ThemedCircle, ThemedPolyline } from '../../../../components/theme/themedComponents';
import { Multiline } from '../../../../utils/svg/multiline';
import { Props } from '../bpmn-gateway-component';

export const BPMNParallelEventBasedGatewayComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedCircle
      cx={element.bounds.width / 2}
      cy={element.bounds.height / 2}
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 12}
      strokeColor={element.strokeColor}
    />
      <ThemedPolyline
          points={`${element.bounds.width / 2} 15, ${element.bounds.width / 2} ${element.bounds.height - 15}`}
          strokeColor={element.strokeColor}
          fillColor={element.fillColor}
      />
      <ThemedPolyline
          points={`15 ${element.bounds.height / 2}, ${element.bounds.width - 15} ${element.bounds.height / 2}`}
          strokeColor={element.strokeColor}
          fillColor={element.fillColor}
      />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height + 20}
      width={element.bounds.width}
      height={element.bounds.height}
      fill={element.textColor}
      lineHeight={16}
      capHeight={11}
    >
      {element.name}
    </Multiline>
  </g>
);
