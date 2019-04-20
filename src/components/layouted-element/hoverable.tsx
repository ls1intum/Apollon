import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ElementComponent, OwnProps } from './element-component';

type StateProps = {};

type DispatchProps = {
  hover: typeof UMLElementRepository.hover;
  leave: typeof UMLElementRepository.leave;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps>(
  null,
  {
    hover: UMLElementRepository.hover,
    leave: UMLElementRepository.leave,
  },
);

export const hoverable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Hoverable extends Component<Props> {
    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('pointerenter', this.enter);
      node.addEventListener('pointerleave', this.leave);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerenter', this.enter);
      node.removeEventListener('pointerleave', this.leave);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }

    private enter = () => this.props.hover(this.props.id);

    private leave = () => this.props.leave(this.props.id);
  }

  return enhance(Hoverable);
};
