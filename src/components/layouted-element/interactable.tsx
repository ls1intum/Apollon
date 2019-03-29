import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { ElementRepository } from '../../services/element/element-repository';
import { ElementComponent, OwnProps } from './element-component';

export const interactable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Interactable extends Component<Props> {
    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('click', this.select);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('click', this.select);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
    private select = (event: MouseEvent) => {
      if (event.which !== 1 || !this.props.element.hovered) return;

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
