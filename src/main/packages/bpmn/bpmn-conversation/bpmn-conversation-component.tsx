import React, { FunctionComponent } from 'react';
import { BPMNConversation } from './bpmn-conversation';
import { ThemedCircle, ThemedPolyline } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

export const BPMNConversationComponent: FunctionComponent<Props> = ({ element }) => (
  <g>
    <ThemedPolyline
      points={`${element.bounds.width / 4} 0, ${(element.bounds.width / 4) * 3} 0, ${element.bounds.width} ${
        element.bounds.height / 2
      }, ${(element.bounds.width / 4) * 3} ${element.bounds.height}, ${element.bounds.width / 4} ${
        element.bounds.height
      }, 0 ${element.bounds.height / 2}, ${element.bounds.width / 4} 0`}
      strokeColor={element.strokeColor}
      fillColor={element.fillColor}
      strokeWidth={element.conversationType === 'call' ? 3 : 1}
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

export interface Props {
  element: BPMNConversation;
}
