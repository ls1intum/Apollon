import React, { ComponentType, FunctionComponent } from 'react';
import { BPMNIntermediateEvent } from './bpmn-intermediate-event';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

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
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 6.5}
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
      />
      <Multiline
        x={element.bounds.width + 10}
        y={element.bounds.height / 2}
        width={element.bounds.width}
        height={element.bounds.height}
        fill={element.textColor}
        lineHeight={16}
        capHeight={11}
        textAnchor="start"
      >
        {element.name}
      </Multiline>
    </g>
  );
};

export const BPMNIntermediateEventComponent = enhance(BPMNIntermediateEventC);
