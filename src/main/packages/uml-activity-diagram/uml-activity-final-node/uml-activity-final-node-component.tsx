import React, { ComponentType, SFC } from 'react';
import { UMLActivityFinalNode } from './uml-activity-final-node';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';

type OwnProps = {
  element: UMLActivityFinalNode;
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

export const UMLActivityFinalNodeC: SFC<Props> = ({ element, interactive, interactable, theme, scale }) => {
  const fill = element.fillColor || 'black';
  return (
    <g>
      <circle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 2.5 * scale}
        stroke={interactable && interactive ? theme.interactive.normal : fill}
        strokeWidth={5 * scale}
        fill="white"
      />
      <circle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2 - 7.5 * scale}
        stroke="none"
        fill={interactive && interactable ? theme.interactive.normal : fill}
        fillOpacity={1}
      />
    </g>
  );
};

export const UMLActivityFinalNodeComponent = enhance(UMLActivityFinalNodeC);
