import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { getAllParents } from '../../../utils/geometry/tree';

type OwnProps = UMLElementComponentProps;

type StateProps = { moving: boolean };

type DispatchProps = {
  hover: typeof UMLElementRepository.hover;
  leave: typeof UMLElementRepository.leave;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => {
    const parents = getAllParents(props.id, state.elements);
    return {
      moving:
        Object.keys(state.moving).includes(props.id) ||
        Object.keys(state.moving).some((elementId) => parents.includes(elementId)),
    };
  },
  {
    hover: UMLElementRepository.hover,
    leave: UMLElementRepository.leave,
  },
);

export const hoverable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, OwnProps> => {
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
      const { hover, leave, moving, ...props } = this.props;
      return <WrappedComponent {...props} />;
    }

    private enter = () => {
      if (!this.props.moving) this.props.hover(this.props.id);
    };

    private leave = () => {
      if (!this.props.moving) this.props.leave(this.props.id);
    };
  }

  return enhance(Hoverable);
};
