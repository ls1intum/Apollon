import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { UMLElementFeatures } from '../../services/uml-element/uml-element-types';
import { ModelState } from '../store/model-state';
import { CanvasElement } from './canvas-element';
import { connectable } from './connectable/connectable';
import { droppable } from './droppable/droppable';
import { hoverable } from './hoverable/hoverable';
import { movable } from './movable/movable';
import { resizable } from './resizable/resizable';
import { selectable } from './selectable/selectable';
import { SvgElement } from './svg-element';
import { updatable } from './updatable/updatable';

export type UMLElementComponentProps = {
  id: string;
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
  type: UMLElementType;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>((state, props) => ({
  features: state.editor.features,
  type: state.elements[props.id].type as UMLElementType,
}));

const getInitialState = (props: Props) => {
  const { features } = UMLElements[props.type];
  const component = components[props.component];
  const decorators = [];

  if (props.features.hoverable && features.hoverable) {
    decorators.push(hoverable);
  }
  if (props.features.selectable && features.selectable) {
    decorators.push(selectable);
  }
  if (props.features.movable && features.movable) {
    decorators.push(movable);
  }
  if (props.features.resizable && features.resizable) {
    const options = {
      preventY: features.resizable === 'WIDTH',
      preventX: features.resizable === 'HEIGHT',
    };
    decorators.push(resizable(options));
  }
  if (props.features.connectable && features.connectable) {
    decorators.push(connectable);
  }
  if (props.features.updatable && features.updatable) {
    decorators.push(updatable);
  }
  if (props.features.droppable && features.droppable) {
    decorators.push(droppable);
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
