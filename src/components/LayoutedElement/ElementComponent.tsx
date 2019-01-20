import React, { Component, RefObject } from 'react';
import styled from 'styled-components';
import Element from './../../domain/Element';
import * as Plugins from './../../domain/plugins';
import Container from '../../domain/Container';
import LayoutedElement from './LayoutedElement';
import { withCanvas } from './../Canvas';
import CoordinateSystem from '../Canvas/CoordinateSystem';
import { CanvasConsumer } from '../Canvas/CanvasContext';

interface SvgProps {
  moving: boolean;
}

const Svg = styled.svg.attrs({
  pointerEvents: 'fill',
})<SvgProps>`
  overflow: visible;
  opacity: ${({ moving }) => (moving ? 0.35 : 1)};

  & text {
    cursor: default;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    pointer-events: none;
    font-family: ${props => props.theme.fontFamily};
  }
`;

class ElementComponent extends Component<Props> {
  static defaultProps = {
    hovered: false,
    selected: false,
    moving: false,
    resizing: false,
  };

  render() {
    const { element } = this.props;
    const Component = (Plugins as any)[`${element.kind}Component`];
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
            <Svg {...bounds} moving={this.props.moving}>
              <g
                filter={
                  this.props.hovered || this.props.selected
                    ? 'url(#highlight)'
                    : ''
                }
              >
                <Component element={element}>
                  {element instanceof Container &&
                    element.ownedElements.map((child: string) => {
                      return <LayoutedElement key={child} element={child} />;
                    })}
                </Component>
              </g>
              {this.props.children}
            </Svg>
          );
        }}
      />
    );
  }
}

export interface OwnProps {
  element: Element;
  hovered: boolean;
  selected: boolean;
  moving: boolean;
  resizing: boolean;
}

type Props = OwnProps;

export default ElementComponent;