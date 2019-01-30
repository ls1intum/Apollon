import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import Element, { ElementRepository } from './../../domain/Element';
import ElementComponent, { OwnProps } from './ElementComponent';
import { InteractiveElementsMode } from '../../services/EditorService';
import Container from '../../domain/Container';

const interactable = (WrappedComponent: typeof ElementComponent) => {
  class Interactable extends Component<Props, State> {
    state: State = {
      interactive: this.props.element.interactive,
    };

    private toggle = (event: MouseEvent) => {
      event.stopPropagation();
      let elementsToToggle = [this.props.element];
      for (const interactiveElement of this.props.interactiveElements) {
        if (
          interactiveElement instanceof Container &&
          interactiveElement.ownedElements.includes(this.props.element.id)
        ) {
          elementsToToggle = [interactiveElement];
        }
        if (interactiveElement.owner === this.props.element.id) {
          elementsToToggle = [this.props.element];
          if (this.props.element instanceof Container) {
            const children = this.props.element.ownedElements
              .filter(id =>
                this.props.interactiveElements.map(e => e.id).includes(id)
              )
              .map<Element>(
                id => this.props.interactiveElements.find(e => e.id === id)!
              );
            elementsToToggle = [...elementsToToggle, ...children];
          }
        }
      }
      console.log(this.props.element, this.props.interactiveElements);
      elementsToToggle
        .map<Element>(e => ({ ...e, interactive: !e.interactive }))
        .forEach(this.props.update);
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('click', this.toggle);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('click', this.toggle);
    }

    componentDidUpdate() {
      if (this.props.element.interactive !== this.state.interactive) {
        this.setState({ interactive: this.props.element.interactive });
      }
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
    interactiveElements: Element[];
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
        interactiveElements: Object.values(state.elements).filter(
          e => state.elements[e.id].interactive
        ),
      }),
      { update: ElementRepository.update }
    )
  )(Interactable);
};

export default interactable;
