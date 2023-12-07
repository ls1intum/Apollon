import React, { FunctionComponent, ReactElement } from 'react';
import { BPMNIntermediateEvent, BPMNIntermediateEventType } from './bpmn-intermediate-event';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/icons/bpmn-message-icon';
import { BPMNMessageFilledIcon } from '../common/icons/bpmn-message-filled-icon';
import { BPMNTimerIcon } from '../common/icons/bpmn-timer-icon';
import { BPMNEscalationFilledIcon } from '../common/icons/bpmn-escalation-filled-icon';
import { BPMNConditionalIcon } from '../common/icons/bpmn-conditional-icon';
import { BPMNLinkIcon } from '../common/icons/bpmn-link-icon';
import { BPMNLinkFilledIcon } from '../common/icons/bpmn-link-filled-icon';
import { BPMNCompensationFilledIcon } from '../common/icons/bpmn-compensation-filled-icon';
import { BPMNSignalIcon } from '../common/icons/bpmn-signal-icon';
import { BPMNSignalFilledIcon } from '../common/icons/bpmn-signal-filled-icon';

export const BPMNIntermediateEventComponent: FunctionComponent<Props> = ({
  element,
  fillColor,
  strokeColor,
  textColor,
}) => {
  /**
   * Retrieve an icon based on a given start event type
   * @param eventType The event type for which an icon should be rendered
   * @param props Additional props that are passed to the rendered icon
   */
  const renderIconForType = (
    eventType: BPMNIntermediateEventType,
    props: React.SVGProps<SVGSVGElement> = {},
  ): null | ReactElement => {
    switch (eventType) {
      case 'default':
        return null;
      case 'message-catch':
        return <BPMNMessageIcon {...props} />;
      case 'message-throw':
        return <BPMNMessageFilledIcon {...props} />;
      case 'timer-catch':
        return <BPMNTimerIcon {...props} />;
      case 'escalation-throw':
        return <BPMNEscalationFilledIcon {...props} />;
      case 'conditional-catch':
        return <BPMNConditionalIcon {...props} />;
      case 'link-catch':
        return <BPMNLinkIcon {...props} />;
      case 'link-throw':
        return <BPMNLinkFilledIcon {...props} />;
      case 'compensation-throw':
        return <BPMNCompensationFilledIcon {...props} />;
      case 'signal-catch':
        return <BPMNSignalIcon {...props} />;
      case 'signal-throw':
        return <BPMNSignalFilledIcon {...props} />;
      default:
        return null;
    }
  };

  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 0.5}
        fillColor={fillColor || element.fillColor || 'transparent'}
        strokeColor={strokeColor || element.strokeColor}
      />
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 3.5}
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
  element: BPMNIntermediateEvent;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
