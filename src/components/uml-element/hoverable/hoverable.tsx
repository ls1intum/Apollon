import React, { Component, ComponentClass, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {};

type DispatchProps = {
  hover: typeof UMLElementRepository.hover;
  leave: typeof UMLElementRepository.leave;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(null, {
  hover: UMLElementRepository.hover,
  leave: UMLElementRepository.leave,
});

export const hoverable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ComponentClass<UMLElementComponentProps> => {
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
      const { hover, leave, ...props } = this.props;
      return <WrappedComponent {...props} />;
    }

    private enter = () => this.props.hover(this.props.id);

    private leave = () => this.props.leave(this.props.id);
  }

  return enhance(Hoverable);
};
