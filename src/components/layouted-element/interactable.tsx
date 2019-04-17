import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { ElementRepository } from '../../services/element/element-repository';
import { ElementComponent, OwnProps } from './element-component';

export const interactable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Interactable extends Component<Props> {
    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('pointerdown', this.select);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerdown', this.select);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
    private select = (event: PointerEvent) => {
      if ((event.which && event.which !== 1) || !this.props.element.hovered) return;

      this.props.makeInteractive(this.props.element.id);
    };
  }

  type StateProps = {};

  type DispatchProps = {
    makeInteractive: typeof ElementRepository.makeInteractive;
  };

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps>(
    null,
    { makeInteractive: ElementRepository.makeInteractive },
  )(Interactable);
};
