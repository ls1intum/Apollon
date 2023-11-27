import React, { ComponentType, FunctionComponent, ReactElement } from 'react';
import { BPMNStartEvent, BPMNStartEventType } from './bpmn-start-event';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNMessageIcon } from '../common/bpmn-message-icon';
import { BPMNTimerIcon } from '../common/bpmn-timer-icon';
import { BPMNSignalIcon } from '../common/bpmn-signal-icon';
import { BPMNConditionalIcon } from '../common/bpmn-conditional-icon';

type OwnProps = {
  element: BPMNStartEvent;
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

const BPMNStartEventC: FunctionComponent<Props> = ({ element, interactive, interactable, theme }) => {
  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2}
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

export const BPMNStartEventComponent = enhance(BPMNStartEventC);
