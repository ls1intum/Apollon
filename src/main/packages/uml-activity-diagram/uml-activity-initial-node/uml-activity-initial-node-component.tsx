import React, { ComponentType, SFC } from 'react';
import { UMLActivityInitialNode } from './uml-activity-initial-node';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { compose } from 'redux';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { ApollonView } from '../../../services/editor/editor-types';

type OwnProps = {
  element: UMLActivityInitialNode;
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

const UMLActivityInitialNodeC: SFC<Props> = ({ element, interactive, interactable, theme }) => {
  const fill = element.fillColor || 'black';

  return (
    <g>
      <circle
        cx="50%"
        cy="50%"
        r={Math.min(element.bounds.width, element.bounds.height) / 2}
        stroke="none"
        fill={interactive && interactable ? theme.interactive.normal : fill}
        fillOpacity={1}
      />
    </g>
  );
};

export const UMLActivityInitialNodeComponent = enhance(UMLActivityInitialNodeC);
