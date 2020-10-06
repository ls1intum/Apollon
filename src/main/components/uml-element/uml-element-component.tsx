import React, { Component, ComponentType } from 'react';
import { connect, ConnectedComponent } from 'react-redux';
import { compose } from 'redux';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { UMLRelationships } from '../../packages/uml-relationships';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types';
import { UMLElementFeatures } from '../../services/uml-element/uml-element-features';
import { UMLRelationshipFeatures } from '../../services/uml-relationship/uml-relationship-features';
import { ModelState } from '../store/model-state';
import { assessable } from './assessable/assessable';
import { CanvasElement } from './canvas-element';
import { CanvasRelationship } from './canvas-relationship';
import { connectable } from './connectable/connectable';
import { droppable } from './droppable/droppable';
import { hoverable } from './hoverable/hoverable';
import { interactable } from './interactable/interactable';
import { movable } from './movable/movable';
import { reconnectable } from './reconnectable/reconnectable';
import { resizable } from './resizable/resizable';
import { selectable } from './selectable/selectable';
import { UMLElementComponentProps } from './uml-element-component-props';
import { updatable } from './updatable/updatable';

type StateProps = {
  features: UMLElementFeatures;
  type: UMLElementType | UMLRelationshipType;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
};

type DispatchProps = {};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>((state, props) => ({
  features: state.editor.features,
  type: state.elements[props.id].type as UMLElementType | UMLRelationshipType,
  readonly: state.editor.readonly,
  view: state.editor.view,
  mode: state.editor.mode,
}));

const getInitialState = (props: Props) => {
  const features = { ...UMLElements, ...UMLRelationships }[props.type].features as UMLElementFeatures &
    UMLRelationshipFeatures;
  const component = props.type in UMLRelationshipType ? CanvasRelationship : CanvasElement;
  const decorators = [];

  if (props.mode === ApollonMode.Assessment) {
    decorators.push(assessable, updatable, selectable, hoverable);
  } else if (props.readonly) {
    decorators.push(selectable, hoverable);
  } else if (props.view === ApollonView.Exporting || props.view === ApollonView.Highlight) {
    decorators.push(interactable, hoverable);
  } else if (props.view === ApollonView.Modelling) {
    if (props.features.hoverable && features.hoverable) {
      decorators.push(hoverable);
    }
    if (features.reconnectable) {
      decorators.push(reconnectable);
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
  }

  type Compose = ConnectedComponent<
    ComponentType<
      UMLElementComponentProps & {
        child: React.ComponentClass<any>;
      }
    >,
    any
  >;

  // reverse, because compose creates one function by composing the given functions from right to left
  return {
    component: compose<Compose>(...decorators.reverse())(component),
  };
};

type State = ReturnType<typeof getInitialState>;

class UMLElementComponentC extends Component<Props, State> {
  state = getInitialState(this.props);

  componentDidUpdate(prevProps: Props) {
    if (prevProps !== this.props) {
      this.setState(getInitialState(this.props));
    }
  }

  render() {
    const { component: ElementComponent } = this.state;

    return <ElementComponent id={this.props.id} child={UMLElementComponent} />;
  }
}

export const UMLElementComponent: ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> = enhance(
  UMLElementComponentC,
);
