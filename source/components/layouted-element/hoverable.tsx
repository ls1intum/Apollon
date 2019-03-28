import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { findDOMNode } from 'react-dom';
import { ElementComponent, OwnProps } from './element-component';
import { ElementRepository } from '../../services/element/element-repository';

export const hoverable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Hoverable extends Component<Props> {
    private enter = () => this.props.hover(this.props.element.id);
    private leave = () => this.props.leave(this.props.element.id);

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('mouseenter', this.enter);
      node.addEventListener('mouseleave', this.leave);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('mouseenter', this.enter);
      node.removeEventListener('mouseleave', this.leave);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }

  interface StateProps {}

  interface DispatchProps {
    hover: typeof ElementRepository.hover;
    leave: typeof ElementRepository.leave;
  }

  type Props = OwnProps & StateProps & DispatchProps;

  return connect<StateProps, DispatchProps, OwnProps>(
    null,
    { hover: ElementRepository.hover, leave: ElementRepository.leave }
  )(Hoverable);
};
