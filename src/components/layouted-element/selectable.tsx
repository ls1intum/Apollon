import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { ElementRepository } from '../../services/element/element-repository';
import { ElementComponent, OwnProps } from './element-component';

export const selectable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Selectable extends Component<Props> {
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
      if ((event.which && event.which !== 1) || !this.props.element.hovered || (this.props.element.selected && !event.shiftKey)) return;
      this.props.select(this.props.element.id, event.shiftKey);
    };
  }

  type StateProps = {};

  type DispatchProps = {
    select: typeof ElementRepository.select;
  };

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps>(
    null,
    { select: ElementRepository.select },
  )(Selectable);
};
