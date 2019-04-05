import React, { Component } from 'react';
import styled from 'styled-components';
import { Components } from '../../packages/components';
import { Container } from '../../services/container/container';
import { Element } from '../../services/element/element';
import { CanvasConsumer } from '../canvas/canvas-context';

type SvgProps = {
  disabled: boolean;
  hidden: boolean;
  moving: boolean;
  isRoot: boolean;
  highlight: boolean;
  highlightColor?: string;
};

const Svg = styled.svg.attrs({
  pointerEvents: 'fill',
})<SvgProps>`
  overflow: visible;
  opacity: ${({ moving, hidden }) => (hidden ? 0 : moving ? 0.35 : 1)};
  fill: ${({ highlight, isRoot, theme, highlightColor }) => highlightColor ? highlightColor : (highlight ? theme.interactiveAreaColor : isRoot ? 'white' : 'none')};

  ${({ disabled }) => disabled && `pointer-events: none;`}

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

export class ElementComponent extends Component<Props> {
  static defaultProps = {
    interactive: false,
    hidden: false,
    selected: false,
    moving: false,
    interactable: false,
    disabled: false,
    childComponent: null,
  };

  render() {
    const { element, interactable } = this.props;
    const ChildComponent = Components[element.type];

    const strokeWidth = 5;
    const disabled = this.props.disabled || this.props.moving;
    const Child = this.props.childComponent;
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
              disabled={disabled}
              moving={this.props.moving}
              isRoot={this.props.element.owner === null}
              hidden={this.props.hidden}
              highlight={interactable && element.interactive}
              highlightColor={element.highlight}
            >
              <ChildComponent element={element}>
                {element instanceof Container &&
                  Child &&
                  element.ownedElements.map((child: string) => {
                    return <Child key={child} element={child} disabled={disabled} />;
                  })}
              </ChildComponent>
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

export type OwnProps = {
  element: Element;
  interactive: boolean;
  hidden: boolean;
  moving: boolean;
  interactable: boolean;
  disabled: boolean;
  childComponent: React.ComponentClass<any> | null;
};

type Props = OwnProps;
