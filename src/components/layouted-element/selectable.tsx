import React, { Component, ComponentClass } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { ModelState } from '../store/model-state';
import { ElementComponent, OwnProps } from './element-component';

type StateProps = {
  hovered: boolean;
  selected: boolean;
};

type DispatchProps = {
  select: typeof UMLElementRepository.select;
  deselect: typeof UMLElementRepository.deselect;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
  }),
  {
    select: UMLElementRepository.select,
    deselect: UMLElementRepository.deselect,
  },
);

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
      if ((event.which && event.which !== 1) || !this.props.hovered) {
        return;
      }
      if (event.shiftKey && this.props.selected) {
        this.props.deselect(this.props.id);
        return;
      }

      this.props.select(this.props.id, !event.shiftKey);
    };
  }

  return enhance(Selectable);
};
