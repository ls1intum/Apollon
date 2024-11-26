import React, { ComponentType, FunctionComponent } from 'react';
import { UMLStateInitialNode } from './uml-state-initial-node';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';
import { ThemedCircleContrast } from '../../../components/theme/themedComponents';

type OwnProps = {
  element: UMLStateInitialNode;
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

const UMLStateInitialNodeC: FunctionComponent<Props> = ({ element, interactive, interactable, theme }) => {
  return (
    <g>
      <ThemedCircleContrast
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2}
        strokeColor="none"
        fillColor={interactive && interactable ? theme.interactive.normal : element.fillColor}
        fillOpacity={1}
      />
    </g>
  );
};

export const UMLStateInitialNodeComponent = enhance(UMLStateInitialNodeC); 