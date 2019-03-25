import React, { Component } from 'react';
import styled from 'styled-components';
import Element from './../../domain/Element';
import * as Plugins from './../../domain/plugins';
import Container from '../../domain/Container';
import LayoutedElement from './LayoutedElement';
import { CanvasConsumer } from '../Canvas/CanvasContext';

interface SvgProps {
  hidden: boolean;
  moving: boolean;
  isRoot: boolean;
  highlight: boolean;
}

const Svg = styled.svg.attrs({
  pointerEvents: 'fill',
})<SvgProps>`
  overflow: visible;
  opacity: ${({ moving, hidden }) => (hidden ? 0 : moving ? 0.35 : 1)};
  fill: ${({ highlight, isRoot, theme }) =>
    highlight ? theme.interactiveAreaColor : isRoot ? 'white' : 'none'};

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
    interactable: false,
  };

  render() {
    const { element, interactable } = this.props;
    const Component = (Plugins as any)[`${element.type}Component`];

    const strokeWidth = 5;
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
              hidden={this.props.hidden}
              highlight={interactable && element.interactive}
            >
              <Component element={element}>
                {element instanceof Container &&
                  element.ownedElements.map((child: string) => {
                    return <LayoutedElement key={child} element={child} />;
                  })}
              </Component>
              {this.props.children}
              {!interactable && (element.hovered || element.selected) && (
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
  interactable: boolean;
}

type Props = OwnProps;

export default ElementComponent;
