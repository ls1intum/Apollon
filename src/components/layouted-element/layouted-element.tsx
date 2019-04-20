import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { ApollonView } from '../../services/editor/editor-types';
import { IUMLElement } from '../../services/uml-element/uml-element';
import { ApollonMode } from '../../typings';
import { ModelState } from '../store/model-state';
import { assessable } from './assessable';
import { connectable } from './connectable';
import { droppable } from './droppable';
import { ElementComponent, OwnProps as ComponentProps } from './element-component';
import { hoverable } from './hoverable';
import { interactable } from './interactable';
import { movable } from './movable';
import { resizable } from './resizable';
import { selectable } from './selectable';
import { updatable } from './updatable';

type DecoratorType = (Component: typeof ElementComponent) => React.ComponentClass<ComponentProps>;

const getInitialState = ({ element, readonly, view, mode }: Props) => {
  let decorators: DecoratorType[] = [];
  if (mode === ApollonMode.Assessment) {
    decorators = [assessable, updatable, selectable, hoverable];
  } else if (readonly) {
    decorators = [selectable, hoverable];
  } else if (view === ApollonView.Exporting || view === ApollonView.Highlight) {
    decorators = [interactable, hoverable];
  } else if (element) {
    const { features } = UMLElements[element.type as UMLElementType];
    if (features.editable) decorators.push(updatable);
    if (features.droppable) decorators.push(droppable);
    if (features.connectable) decorators.push(connectable);
    if (features.resizable !== 'NONE') {
      decorators.push(
        resizable({ preventX: features.resizable === 'HEIGHT', preventY: features.resizable === 'WIDTH' }),
      );
    }
    if (features.movable) decorators.push(movable);
    if (features.selectable) decorators.push(selectable);
    if (features.hoverable) decorators.push(hoverable);
  }

  return {
    component: compose<typeof ElementComponent>(...decorators)(ElementComponent),
  };
};

type State = ReturnType<typeof getInitialState>;

class LayoutedElementComponent extends Component<Props, State> {
  static defaultProps = {
    disabled: false,
  };

  state = getInitialState(this.props);

  componentDidUpdate(prevProps: Props) {
    if (prevProps.view !== this.props.view) {
      this.setState(getInitialState(this.props));
    }
  }

  render() {
    const ElementComponents = this.state.component;
    const { element } = this.props;

    if (!element) return null;
    return (
      <ElementComponents
        childComponent={LayoutedElement}
        id={this.props.id}
        element={element}
        disabled={this.props.disabled}
        interactable={this.props.view === ApollonView.Exporting || this.props.view === ApollonView.Highlight}
        hidden={this.props.view === ApollonView.Highlight && this.props.interactive}
      />
    );
  }
}

type OwnProps = {
  id: string;
  disabled: boolean;
};

type StateProps = {
  element?: IUMLElement;
  readonly: boolean;
  view: ApollonView;
  mode: ApollonMode;
  interactive: boolean;
};

type DispatchProps = {};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    element: state.elements[props.id],
    readonly: state.editor.readonly,
    view: state.editor.view,
    mode: state.editor.mode,
    interactive: state.interactive.includes(props.id),
  }),
  {},
);

export const LayoutedElement = enhance(LayoutedElementComponent);
