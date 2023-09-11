import React, { ComponentType, FunctionComponent } from 'react';
import { BPMNIntermediateEvent } from './bpmn-intermediate-event';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle, ThemedCircleContrast } from '../../../components/theme/themedComponents';

type OwnProps = {
  element: BPMNIntermediateEvent;
  scale: number;
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

const BPMNIntermediateEventC: FunctionComponent<Props> = ({ element, interactive, interactable, theme, scale }) => {
  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5 * scale}
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
      />
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5 * scale}
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
      />
    </g>
  );
};

export const BPMNIntermediateEventComponent = enhance(BPMNIntermediateEventC);
