import React, { FunctionComponent } from 'react';
import { ThemedCircle, ThemedPath, ThemedPolyline } from '../../../../components/theme/themedComponents';
import { Multiline } from '../../../../utils/svg/multiline';
import { Props } from '../bpmn-gateway-component';

export const BPMNEventBasedGatewayComponent: FunctionComponent<Props> = ({ element, fillColor }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 2} 0, ${element.bounds.width} ${element.bounds.height / 2}, ${
        element.bounds.width / 2
      } ${element.bounds.height}, 0 ${element.bounds.height / 2}, ${element.bounds.width / 2} 0`}
      strokeColor={element.strokeColor}
      fillColor={fillColor || element.fillColor}
    />
    <ThemedCircle
      cx={element.bounds.width / 2}
      cy={element.bounds.height / 2}
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 9}
      strokeColor={element.strokeColor}
      fillColor="transparent"
    />
    <ThemedCircle
      cx={element.bounds.width / 2}
      cy={element.bounds.height / 2}
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 12}
      strokeColor={element.strokeColor}
      fillColor="transparent"
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
      fillColor="transparent"
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height + 20}
      width={element.bounds.width}
      height={element.bounds.height}
      fill={element.textColor}
      lineHeight={16}
      capHeight={11}
      verticalAnchor="start"
    >
      {element.name}
    </Multiline>
  </g>
);
