import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLElementFeatures } from '../../services/uml-element/uml-element-types';
import { ApollonMode } from '../../typings';
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
  readonly: boolean;
  mode: ApollonMode;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(state => ({
  features: state.features,
  readonly: state.editor.readonly,
  mode: state.editor.mode,
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
  if (!props.readonly && props.mode !== ApollonMode.Assessment) {
    if (props.features.movable) {
      decorators.push(movable);
    }
    if (props.features.resizable) {
      decorators.push(resizable());
    }
    if (props.features.connectable) {
      decorators.push(connectable);
    }
    if (props.features.updatable) {
      decorators.push(updatable);
    }
    if (props.features.droppable) {
      decorators.push(droppable);
    }
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
