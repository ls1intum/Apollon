import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { connectable } from '../layouted-element/connectable';
import { hoverable } from '../layouted-element/hoverable';
import { movable } from '../layouted-element/movable';
import { resizable } from '../layouted-element/resizable';
import { selectable } from '../layouted-element/selectable';
import { updatable } from '../layouted-element/updatable';
import { ModelState } from '../store/model-state';
import { CanvasElement } from './canvas-element';
import { SvgElement } from './svg-element';

export type UMLElementComponentProps = {
  id: string;
};

// TODO: Move
export type UMLElementFeatures = {
  hoverable: boolean;
  selectable: boolean;
  movable: boolean;
  resizable: boolean;
  connectable: boolean;
  updatable: boolean;
};

const components = {
  canvas: CanvasElement,
  svg: SvgElement,
};

type OwnProps = {
  id: string;
  component: keyof typeof components;
};

type StateProps = {
  features: UMLElementFeatures;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
  features: state.features,
}));

const getInitialState = (props: Props) => {
  const component = components[props.component];
  const decorators = [];

  if (props.features.hoverable) {
    decorators.push(hoverable);
  }
  if (props.features.selectable) {
    decorators.push(selectable);
  }
  if (props.features.movable) {
    decorators.push(movable);
  }
  if (props.features.resizable) {
    decorators.push(resizable());
  }
  if (props.features.connectable) {
    decorators.push(connectable);
  }
  if (props.features.connectable) {
    decorators.push(connectable);
  }
  if (props.features.updatable) {
    decorators.push(updatable);
  }

  return {
    component: compose<ComponentType<UMLElementComponentProps>>(...decorators.reverse())(component),
  };
};

type State = ReturnType<typeof getInitialState>;

class UMLElementComponentC extends Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    const { component: ElementComponent } = this.state;
    return <ElementComponent id={this.props.id} />;
  }
}

export const UMLElementComponent = enhance(UMLElementComponentC);
