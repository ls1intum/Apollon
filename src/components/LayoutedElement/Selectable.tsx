import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import ElementComponent, { OwnProps } from './ElementComponent';
import { ElementRepository } from '../../services/element';

const selectable = (
  WrappedComponent: typeof ElementComponent
): ComponentClass<OwnProps> => {
  class Selectable extends Component<Props> {
    private select = (event: MouseEvent) => {
      if (
        event.which !== 1 ||
        !this.props.element.hovered ||
        (this.props.element.selected && !event.shiftKey)
      )
        return;
      this.props.select(this.props.element.id, event.shiftKey);
    };

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('mousedown', this.select);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('mousedown', this.select);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  interface StateProps {}

  interface DispatchProps {
    select: typeof ElementRepository.select;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps>(
    null,
    { select: ElementRepository.select }
  )(Selectable);
};

export default selectable;
