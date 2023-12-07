import React, { FunctionComponent, ReactElement } from 'react';
import { BPMNStartEvent, BPMNStartEventType } from './bpmn-start-event';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/icons/bpmn-message-icon';
import { BPMNTimerIcon } from '../common/icons/bpmn-timer-icon';
import { BPMNSignalIcon } from '../common/icons/bpmn-signal-icon';
import { BPMNConditionalIcon } from '../common/icons/bpmn-conditional-icon';

/**
 * Retrieve an icon based on a given start event type
 * @param eventType The event type for which an icon should be rendered
 * @param props Additional props that are passed to the rendered icon
 */
const renderIconForType = (
  eventType: BPMNStartEventType,
  props: React.SVGProps<SVGSVGElement> = {},
): null | ReactElement => {
  switch (eventType) {
    case 'default':
      return null;
    case 'message':
      return <BPMNMessageIcon {...props} />;
    case 'timer':
      return <BPMNTimerIcon {...props} />;
    case 'conditional':
      return <BPMNConditionalIcon {...props} />;
    case 'signal':
      return <BPMNSignalIcon {...props} />;
    default:
      return null;
  }
};

export const BPMNStartEventComponent: FunctionComponent<Props> = ({ element, fillColor, strokeColor, textColor }) => {
  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2}
        fillColor={fillColor || element.fillColor || 'transparent'}
        strokeColor={strokeColor || element.strokeColor}
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
      {renderIconForType(element.eventType, {
        x: element.bounds.width / 2 - 10,
        y: element.bounds.height / 2 - 10,
      })}
    </g>
  );
};

interface Props {
  element: BPMNStartEvent;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}

interface Props {
  element: BPMNStartEvent;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
