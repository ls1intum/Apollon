import React, { ComponentType, FunctionComponent } from 'react';
import { UMLActivityFinalNode } from './uml-activity-final-node';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircle, ThemedCircleContrast } from '../../../components/theme/themedComponents';

type OwnProps = {
  element: UMLActivityFinalNode;
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

export const UMLActivityFinalNodeC: FunctionComponent<Props> = ({ element, interactive, interactable, theme }) => {
  return (
    <g>
      <ThemedCircle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5}
        strokeColor={interactable && interactive ? theme.interactive.normal : element.fillColor}
        strokeWidth={5}
      />
      <ThemedCircleContrast
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5}
        strokeColor="none"
        fillColor={interactive && interactable ? theme.interactive.normal : element.fillColor}
        fillOpacity={1}
      />
    </g>
  );
};

export const UMLActivityFinalNodeComponent = enhance(UMLActivityFinalNodeC);
