import React, { FunctionComponent, ReactElement } from 'react';
import { BPMNEndEvent, BPMNEndEventType } from './bpmn-end-event';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageFilledIcon } from '../common/icons/bpmn-message-filled-icon';
import { BPMNEscalationFilledIcon } from '../common/icons/bpmn-escalation-filled-icon';
import { BPMNCompensationFilledIcon } from '../common/icons/bpmn-compensation-filled-icon';
import { BPMNSignalFilledIcon } from '../common/icons/bpmn-signal-filled-icon';
import { BPMNTerminateFilledIcon } from '../common/icons/bpmn-terminate-filled-icon';
import { BPMNErrorFilledIcon } from '../common/icons/bpmn-error-filled-icon';

export const BPMNEndEventComponent: FunctionComponent<Props> = ({ element, fillColor, strokeColor, textColor }) => {
  /**
   * Retrieve an icon based on a given start event type
   * @param eventType The event type for which an icon should be rendered
   * @param props Additional props that are passed to the rendered icon
   */
  const renderIconForType = (
    eventType: BPMNEndEventType,
    props: React.SVGProps<SVGSVGElement> = {},
  ): null | ReactElement => {
    switch (eventType) {
      case 'default':
        return null;
      case 'message':
        return <BPMNMessageFilledIcon {...props} />;
      case 'escalation':
        return <BPMNEscalationFilledIcon {...props} />;
      case 'error':
        return <BPMNErrorFilledIcon {...props} />;
      case 'compensation':
        return <BPMNCompensationFilledIcon {...props} />;
      case 'signal':
        return <BPMNSignalFilledIcon {...props} />;
      case 'terminate':
        return <BPMNTerminateFilledIcon {...props} />;
      default:
        return null;
    }
  };

  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 1.5}
        strokeWidth={3}
        fillColor={fillColor || element.fillColor}
        strokeColor={strokeColor || element.strokeColor}
      />
      <Multiline
        x={element.bounds.width / 2}
        y={element.bounds.height + 20}
        fill={textColor || element.textColor}
        width={element.bounds.width * 2}
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
  element: BPMNEndEvent;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
