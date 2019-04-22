import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

const initialState = {
  previousEvent: null as PointerEvent | null,
};

type StateProps = {};

type DispatchProps = {
  updateStart: typeof UMLElementRepository.updateStart;
};

type Props = OwnProps & StateProps & DispatchProps;

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  null,
  {
    updateStart: UMLElementRepository.updateStart,
  },
);

export const updatable = (WrappedComponent: typeof ElementComponent): ComponentClass<OwnProps> => {
  class Updatable extends Component<Props, State> {
    state = initialState;

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('pointerdown', this.onPointerDown);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('pointerdown', this.onPointerDown);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }

    private onPointerDown = (event: PointerEvent) => {
      const { previousEvent } = this.state;
      this.setState({ previousEvent: event });

      if (!previousEvent) {
        return;
      }

      const withinTime = event.timeStamp - previousEvent.timeStamp < 300;
      const withinBoundsX = Math.abs(event.clientX - previousEvent.clientX) < 30;
      const withinBoundsY = Math.abs(event.clientY - previousEvent.clientY) < 30;

      if (withinTime && withinBoundsX && withinBoundsY) {
        this.props.updateStart(this.props.id);
      }
    };
  }

  return enhance(Updatable);
};