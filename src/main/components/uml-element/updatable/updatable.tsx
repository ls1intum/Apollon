import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { AsyncDispatch } from '../../../utils/actions/actions.js';
import { ModelState } from '../../store/model-state.js';
import { UMLElementComponentProps } from '../uml-element-component-props.js';

const initialState = {};

type StateProps = {};

type DispatchProps = {
  updateStart: AsyncDispatch<typeof UMLElementRepository.updateStart>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(null, {
  updateStart: UMLElementRepository.updateStart,
});

export const updatable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Updatable extends Component<Props, State> {
    state = initialState;

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('dblclick', this.onDoubleClick);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dblclick', this.onDoubleClick);
    }

    render() {
      const { updateStart, ...props } = this.props;
      return <WrappedComponent {...props} />;
    }

    private onDoubleClick = () => {
      this.props.updateStart(this.props.id);
    };
  }

  return enhance(Updatable);
};
