import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { InteractiveElementsMode } from '../../services/EditorService';

const interactable = (WrappedComponent: typeof ElementComponent) => {
  class Interactable extends Component<Props, State> {
    state: State = {
      interactive: this.props.element.interactive,
    };

    private toggle = (event: MouseEvent) => {
      event.stopPropagation();
      this.setState(
        state => ({ interactive: !state.interactive }),
        () => {
          const element: Element = {
            ...this.props.element,
            interactive: this.state.interactive,
          };
          this.props.update(element);
        }
      );
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('click', this.toggle);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('click', this.toggle);
    }

    render() {
      return (
        <WrappedComponent
          {...this.props}
          interactable={this.state.interactive}
          hidden={
            this.props.mode === InteractiveElementsMode.Hidden &&
            this.state.interactive
          }
        />
      );
    }
  }

  interface StateProps {
    mode: InteractiveElementsMode;
  }

  interface DispatchProps {
    update: typeof ElementRepository.update;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  interface State {
    interactive: boolean;
  }

  return compose<ComponentClass<OwnProps>>(
    connect(
      (state: ReduxState): StateProps => ({
        mode: state.editor.interactiveMode,
      }),
      { update: ElementRepository.update }
    )
  )(Interactable);
};

export default interactable;
