import React, { ComponentType, SFC } from 'react';
import { UMLActivityForkNode } from './uml-activity-fork-node';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';

type OwnProps = {
  element: UMLActivityForkNode;
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

const UMLActivityForkNodeC: SFC<Props> = ({ element, interactive, interactable, theme }) => {
  const fill = element.color?.fill || 'black';

  return (
    <g>
      <rect
        width={element.bounds.width}
        height={element.bounds.height}
        stroke="none"
        fill={interactive && interactable ? theme.interactive.normal : fill}
        fillOpacity={1}
      />
    </g>
  );
};

export const UMLActivityForkNodeComponent = enhance(UMLActivityForkNodeC);
