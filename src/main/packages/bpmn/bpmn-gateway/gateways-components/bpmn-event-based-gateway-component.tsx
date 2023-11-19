import React, { FunctionComponent } from 'react';
import { ThemedPath, ThemedPolyline } from '../../../../components/theme/themedComponents';
import { Multiline } from '../../../../utils/svg/multiline';
import { Props } from '../bpmn-gateway-component';

export const BPMNEventBasedGatewayComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
    />
    <ThemedPath
      d={
        [
          `M${element.bounds.width / 2}, ${element.bounds.height / 2 - 4}`,
          `L${element.bounds.width / 2 + 3.5}, ${element.bounds.height / 2 - 1}`,
          `L${element.bounds.width / 2 + 2} ${element.bounds.height / 2 + 3.5}`,
          `L${element.bounds.width / 2 - 2} ${element.bounds.height / 2 + 3.5}`,
          `L${element.bounds.width / 2 - 3.5} ${element.bounds.height / 2 - 1}`,
          `L${element.bounds.width / 2} ${element.bounds.height / 2 - 4}`,
        ].join(' ') + ' z'
      }
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
