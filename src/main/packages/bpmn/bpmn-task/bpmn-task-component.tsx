import React, { FunctionComponent, ReactElement } from 'react';
import { BPMNTask, BPMNTaskType } from './bpmn-task';
import { ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/icons/bpmn-message-icon';
import { BPMNMessageFilledIcon } from '../common/icons/bpmn-message-filled-icon';
import { BPMNScriptIcon } from '../common/icons/bpmn-script-icon';
import { BPMNBusinessRuleIcon } from '../common/icons/bpmn-business-rule-icon';
import { BPMNManualIcon } from '../common/icons/bpmn-manual-icon';
import { BPMNUserIcon } from '../common/icons/bpmn-user-icon';
import { BPMNSequentialMarkerIcon } from '../common/markers/bpmn-sequential-marker-icon';
import { BPMNMarkerType } from '../common/types';
import { BpmnLoopMarkerIcon } from '../common/markers/bpmn-loop-marker-icon';
import { BPMNParallelMarkerIcon } from '../common/markers/bpmn-parallel-marker-icon';

export const BPMNTaskComponent: FunctionComponent<Props> = ({ element, fillColor, strokeColor, textColor }) => {
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

  const renderMarker = (taskType: BPMNMarkerType, props: React.SVGProps<SVGSVGElement> = {}): null | ReactElement => {
    switch (taskType) {
      case 'none':
        return null;
      case 'parallel multi instance':
        return <BPMNParallelMarkerIcon {...props} />;
      case 'sequential multi instance':
        return <BPMNSequentialMarkerIcon {...props} />;
      case 'loop':
        return <BpmnLoopMarkerIcon {...props} />;
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
        fillColor={fillColor || element.fillColor}
        strokeColor={strokeColor || element.strokeColor}
      />
      <Multiline
        x={element.bounds.width / 2}
        y={element.bounds.height / 2}
        width={element.bounds.width}
        height={element.bounds.height}
        fontWeight="bold"
        fill={textColor || element.textColor}
        lineHeight={16}
        capHeight={11}
      >
        {element.name}
      </Multiline>
      {renderIconForType(element.taskType, {
        x: 10,
        y: 10,
      })}
      {renderMarker(element.marker, {
        x: element.bounds.width / 2 - 7,
        y: element.bounds.height - 16,
      })}
    </g>
  );
};

interface Props {
  element: BPMNTask;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
}
