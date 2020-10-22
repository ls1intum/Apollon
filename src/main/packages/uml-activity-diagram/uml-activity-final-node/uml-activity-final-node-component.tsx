import React, { ComponentType, SFC } from 'react';
import { UMLActivityFinalNode } from './uml-activity-final-node';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';

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

export const UMLActivityFinalNodeC: SFC<Props> = ({ element, interactive, interactable, theme }) => (
  <g>
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5}
      stroke={interactable && interactive ? theme.interactive.normal : 'black'}
      strokeWidth="5"
    />
    <circle
      cx="50%"
      cy="50%"
      r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5}
      stroke="none"
      fill={interactive && interactable ? theme.interactive.normal : 'black'}
      fillOpacity={1}
    />
  </g>
);

export const UMLActivityFinalNodeComponent = enhance(UMLActivityFinalNodeC);
