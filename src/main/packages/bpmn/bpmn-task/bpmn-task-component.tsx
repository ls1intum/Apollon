import React, { FunctionComponent, ReactElement } from 'react';
import { BPMNTask, BPMNTaskType } from './bpmn-task';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/bpmn-message-icon';
import { BPMNMessageFilledIcon } from '../common/bpmn-message-filled-icon';
import { BPMNScriptIcon } from '../common/bpmn-script-icon';
import { BPMNBusinessRuleIcon } from '../common/bpmn-business-rule-icon';
import { BPMNManualIcon } from '../common/bpmn-manual-icon';
import { BPMNUserIcon } from '../common/bpmn-user-icon';

export const BPMNTaskComponent: FunctionComponent<Props> = ({ element, fillColor }) => {
  /**
   * Retrieve an icon based on a given task type
   * @param taskType The task type for which an icon should be rendered
   * @param props Additional props that are passed to the rendered icon
   */
  const renderIconForType = (
    taskType: BPMNTaskType,
    props: React.SVGProps<SVGSVGElement> = {},
  ): null | ReactElement => {
    switch (taskType) {
      case 'default':
        return null;
      case 'user':
        return <BPMNUserIcon {...props} />;
      case 'send':
        return <BPMNMessageFilledIcon {...props} />;
      case 'receive':
        return <BPMNMessageIcon {...props} />;
      case 'manual':
        return <BPMNManualIcon {...props} />;
      case 'business-rule':
        return <BPMNBusinessRuleIcon {...props} />;
      case 'script':
        return <BPMNScriptIcon {...props} />;
      default:
        return null;
    }
  };

  return (
    <g>
      <ThemedRect
        rx={10}
        ry={10}
        width="100%"
        height="100%"
        strokeColor={element.strokeColor}
        fillColor={fillColor || element.fillColor}
      />
      <Multiline
        x={element.bounds.width / 2}
        y={element.bounds.height / 2}
        width={element.bounds.width}
        height={element.bounds.height}
        fontWeight="bold"
        fill={element.textColor}
        lineHeight={16}
        capHeight={11}
      >
        {element.name}
      </Multiline>
      {renderIconForType(element.taskType, {
        x: 10,
        y: 10,
      })}
    </g>
  );
};

interface Props {
  element: BPMNTask;
  fillColor?: string;
}
