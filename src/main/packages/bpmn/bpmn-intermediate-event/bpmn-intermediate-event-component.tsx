import React, { ComponentType, FunctionComponent, ReactElement } from 'react';
import { BPMNIntermediateEvent, BPMNIntermediateEventType } from './bpmn-intermediate-event';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/bpmn-message-icon';
import { BPMNMessageFilledIcon } from '../common/bpmn-message-filled-icon';
import { BPMNTimerIcon } from '../common/bpmn-timer-icon';
import { BPMNEscalationFilledIcon } from '../common/bpmn-escalation-filled-icon';
import { BPMNConditionalIcon } from '../common/bpmn-conditional-icon';
import { BPMNLinkIcon } from '../common/bpmn-link-icon';
import { BPMNLinkFilledIcon } from '../common/bpmn-link-filled-icon';
import { BPMNCompensationFilledIcon } from '../common/bpmn-compensation-filled-icon';
import { BPMNSignalIcon } from '../common/bpmn-signal-icon';
import { BPMNSignalFilledIcon } from '../common/bpmn-signal-filled-icon';

type OwnProps = {
  element: BPMNIntermediateEvent;
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

const BPMNIntermediateEventC: FunctionComponent<Props> = ({ element, interactive, interactable, theme }) => {
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
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
      />
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 3.5}
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
      />
      <Multiline
        x={element.bounds.width / 2}
        y={element.bounds.height + 20}
        width={element.bounds.width}
        fill={element.textColor}
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

export const BPMNIntermediateEventComponent = enhance(BPMNIntermediateEventC);
