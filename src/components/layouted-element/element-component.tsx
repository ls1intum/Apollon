import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Components } from '../../packages/components';
import { IUMLContainer } from '../../services/uml-container/uml-container';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { CanvasConsumer } from '../canvas/canvas-context';
import { ModelState } from '../store/model-state';

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
  fill: ${({ highlight, isRoot, theme, highlightColor }) =>
    highlightColor ? highlightColor : highlight ? 'rgba(0, 220, 0, 0.3)' : isRoot ? 'white' : 'none'};

  ${({ disabled }) => disabled && `pointer-events: none;`}

  & text {
    cursor: default;
    user-select: none;
    pointer-events: none;
    font-family: ${props => props.theme.fontFamily};
    fill: black;
  }
`;

export class ElementComponentComponent extends Component<Props> {
  static defaultProps = {
    hidden: false,
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
          const container = element as IUMLContainer;
          return (
            <Svg
              id={element.id}
              {...bounds}
              disabled={disabled}
              moving={this.props.moving}
              isRoot={this.props.element.owner === null}
              hidden={this.props.hidden}
              highlight={interactable && this.props.interactive}
              highlightColor={element.highlight}
            >
              <ChildComponent element={element}>
                {'ownedElements' in container &&
                  Child &&
                  container.ownedElements.map((child: string) => {
                    return <Child key={child} id={child} disabled={disabled} />;
                  })}
              </ChildComponent>
              {this.props.children}
              {!interactable && (this.props.hovered || this.props.selected) && (
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
  id: string;
  element: IUMLElement;
  hidden: boolean;
  moving: boolean;
  interactable: boolean;
  disabled: boolean;
  childComponent: React.ComponentClass<any> | null;
};

type StateProps = {
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
    interactive: state.interactive.includes(props.id),
  }),
  {},
);

export const ElementComponent = enhance(ElementComponentComponent);
