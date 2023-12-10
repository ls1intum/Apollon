import React, { ComponentType, FunctionComponent } from 'react';
import { ThemedPath, ThemedRect } from '../../../components/theme/themedComponents';
import { Multiline } from '../../../utils/svg/multiline';
import { BPMNGroup } from '../bpmn-group/bpmn-group';
import { withTheme, withThemeProps } from '../../../components/theme/styles';
import { compose } from 'redux';
import { connect, ConnectedComponent } from 'react-redux';
import { ModelState } from '../../../components/store/model-state';
import { ApollonView } from '../../../services/editor/editor-types';

type OwnProps = {
  element: BPMNGroup;
  strokeColor?: string;
  textColor?: string;
  children?: React.ReactNode;
};

type StateProps = { interactive: boolean; interactable: boolean; hovered: boolean };

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps & withThemeProps;

const enhance = compose<ConnectedComponent<ComponentType<Props>, OwnProps>>(
  withTheme,
  connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
    hovered: state.hovered.includes(props.element.id),
    interactive: state.interactive.includes(props.element.id),
    interactable: state.editor.view === ApollonView.Exporting || state.editor.view === ApollonView.Highlight,
  })),
);

export const BPMNAnnotationC: FunctionComponent<Props> = ({
  element,
  strokeColor,
  textColor,
  interactive,
  interactable,
  hovered,
  theme,
}) => (
  <g>
    <ThemedRect
      rx={10}
      ry={10}
      width={element.bounds.width}
      height={element.bounds.height}
      strokeColor="transparent"
      fillColor={
        interactable && interactive
          ? theme.interactive.normal
          : interactable && hovered
            ? theme.interactive.hovered
            : 'transparent'
      }
    />
    <ThemedPath
      d={`M20,0 L10,0 A 10 10 280 0 0 0 10 L0,${element.bounds.height - 10} A 10 10 180 0 0 10 ${
        element.bounds.height
      } L20, ${element.bounds.height}`}
      strokeColor={strokeColor || element.strokeColor}
      fillColor="transparent"
    />
    <Multiline
      x={element.bounds.width / 2}
      y={element.bounds.height / 2}
      width={element.bounds.width}
      height={element.bounds.height}
      fontWeight="bold"
      fill={textColor || element.textColor}
      lineHeight={16}
      capHeight={11}
    >
      {element.name}
    </Multiline>
  </g>
);

export const BPMNAnnotationComponent = enhance(BPMNAnnotationC);
