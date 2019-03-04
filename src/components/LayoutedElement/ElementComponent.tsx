import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { State as ReduxState } from './../Store';
import Element from './../../domain/Element';
import * as Plugins from './../../domain/plugins';
import Container from '../../domain/Container';
import LayoutedElement from './LayoutedElement';
import { CanvasConsumer } from '../Canvas/CanvasContext';
import { EditorMode } from '../../services/EditorService';

interface SvgProps {
  hidden: boolean;
  moving: boolean;
  isRoot: boolean;
  interactable: boolean;
  interactive: boolean;
}

const Svg = styled.svg.attrs({
  pointerEvents: 'fill',
})<SvgProps>`
  overflow: visible;
  opacity: ${({ moving, hidden }) => (hidden ? 0 : moving ? 0.35 : 1)};
  fill: ${({ interactable, isRoot, theme }) =>
    interactable ? theme.interactiveAreaColor : isRoot ? 'white' : 'none'};

  pointer-events: ${({ interactive }) => (interactive ? 'fill' : 'none')};

  & text {
    cursor: default;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    pointer-events: none;
    font-family: ${props => props.theme.fontFamily};
    fill: black;
  }
`;

class ElementComponent extends Component<Props> {
  static defaultProps = {
    interactive: false,
    hidden: false,
    selected: false,
    moving: false,
    resizing: false,
    interactable: false,
  };

  render() {
    const { element } = this.props;
    const Component = (Plugins as any)[`${element.kind}Component`];

    const strokeWidth = 5;

    // const features = element.constructor as any;
    // const interactive =
    //   (this.props.editorMode === EditorMode.ModelingView &&
    //     (features.isSelectable ||
    //       features.isDroppable ||
    //       features.isResizable ||
    //       features.isMovable ||
    //       features.isSelectable ||
    //       features.isHoverable)) ||
    //   (this.props.editorMode === EditorMode.InteractiveElementsView &&
    //     features.isInteractable);

    return (
      <CanvasConsumer
        children={context => {
          let bounds = element.bounds;
          if (context && element.owner === null) {
            bounds = {
              ...bounds,
              ...context.coordinateSystem.pointToScreen(bounds.x, bounds.y),
            };
          }
          return (
            <Svg
              id={element.id}
              {...bounds}
              moving={this.props.moving}
              isRoot={this.props.element.owner === null}
              interactable={this.props.interactable}
              hidden={this.props.hidden}
              interactive={this.props.interactive}
            >
              <Component element={element}>
                {element instanceof Container &&
                  element.ownedElements.map((child: string) => {
                    return <LayoutedElement key={child} element={child} />;
                  })}
              </Component>
              {this.props.children}
              {(element.hovered || element.selected) && (
                <rect
                  x={-strokeWidth / 2}
                  y={-strokeWidth / 2}
                  width={bounds.width + strokeWidth}
                  height={bounds.height + strokeWidth}
                  fill="none"
                  stroke="#0064ff"
                  strokeOpacity="0.2"
                  strokeWidth={strokeWidth}
                  pointerEvents="none"
                />
              )}
            </Svg>
          );
        }}
      />
    );
  }
}

export interface OwnProps {
  element: Element;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  resizing: boolean;
  interactable: boolean;
}

// interface StateProps {
//   editorMode: EditorMode;
// }

type Props = OwnProps; // & StateProps;

export default ElementComponent;
// connect(
//   (state: ReduxState): StateProps => ({
//     editorMode: state.editor.editorMode,
//   })
// )(ElementComponent);
