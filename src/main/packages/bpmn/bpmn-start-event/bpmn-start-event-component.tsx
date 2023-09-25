import React, { ComponentType, FunctionComponent } from 'react';
import { BPMNStartEvent } from './bpmn-start-event';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';

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
        height={element.bounds.height}
        fill={element.textColor}
        lineHeight={16}
        capHeight={11}
      >
        {element.name}
      </Multiline>
    </g>
  );
};

export const BPMNStartEventComponent = enhance(BPMNStartEventC);
