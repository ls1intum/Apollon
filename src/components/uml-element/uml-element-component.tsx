import React, { Component, ComponentType } from 'react';
import { compose } from 'redux';
import { hoverable } from '../layouted-element/hoverable';
import { movable } from '../layouted-element/movable';
import { resizable } from '../layouted-element/resizable';
import { selectable } from '../layouted-element/selectable';
import { CanvasElement } from './canvas-element';
import { SvgElement } from './svg-element';

export type UMLElementComponentProps = {
  id: string;
};

const components = {
  canvas: CanvasElement,
  svg: SvgElement,
};

type Props = {
  id: string;
  component: keyof typeof components;
};

const getInitialState = (component: ComponentType<UMLElementComponentProps>) => {
  const decorators = [hoverable, selectable, movable, resizable()];

  return {
    component: compose<ComponentType<UMLElementComponentProps>>(...decorators.reverse())(component),
  };
};

type State = ReturnType<typeof getInitialState>;

export class UMLElementComponent extends Component<Props, State> {
  state = getInitialState(components[this.props.component]);

  render() {
    const { component: ElementComponent } = this.state;
    return <ElementComponent id={this.props.id} />;
  }
}
