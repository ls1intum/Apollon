import React, { ComponentType, FunctionComponent, ReactElement } from 'react';
import { BPMNEndEvent, BPMNEndEventType } from './bpmn-end-event';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageFilledIcon } from '../common/bpmn-message-filled-icon';
import { BPMNEscalationFilledIcon } from '../common/bpmn-escalation-filled-icon';
import { BPMNCompensationFilledIcon } from '../common/bpmn-compensation-filled-icon';
import { BPMNSignalFilledIcon } from '../common/bpmn-signal-filled-icon';
import { BPMNTerminateFilledIcon } from '../common/bpmn-terminate-filled-icon';
import { BPMNErrorFilledIcon } from '../common/bpmn-error-filled-icon';

type OwnProps = {
  element: BPMNEndEvent;
};

type StateProps = { interactive: boolean; interactable: boolean };

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const enhance = compose<ConnectedComponent<ComponentType<Props>, OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
    interactive: state.interactive.includes(props.element.id),
    interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
  })),
);

export const BPMNEndEventC: FunctionComponent<Props> = ({ element, interactive, interactable, theme }) => {
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
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
        strokeWidth={3}
      />
      <Multiline
        x={element.bounds.width / 2}
        y={element.bounds.height + 20}
        fill={element.textColor}
        width={element.bounds.width}
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

export const BPMNEndEventComponent = enhance(BPMNEndEventC);
