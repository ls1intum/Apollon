import React, { Component, ComponentClass, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { OwnProps } from './element-component';

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

export const hoverable = (WrappedComponent: ComponentType<OwnProps>): ComponentClass<OwnProps> => {
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
      return (
        <WrappedComponent id={this.props.id} className={this.props.className}>
          {this.props.children}
        </WrappedComponent>
      );
    }

    private enter = () => this.props.hover(this.props.id);

    private leave = () => this.props.leave(this.props.id);
  }

  return enhance(Hoverable);
};
