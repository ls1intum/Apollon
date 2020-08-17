import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';

type StateProps = {
  hovered: boolean;
  selected: boolean;
};

type DispatchProps = {
  select: AsyncDispatch<typeof UMLElementRepository.select>;
  deselect: AsyncDispatch<typeof UMLElementRepository.deselect>;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
  }),
  {
    select: UMLElementRepository.select,
    deselect: UMLElementRepository.deselect,
  },
);

export const selectable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
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
      const { hovered, selected, select, deselect, ...props } = this.props;
      return <WrappedComponent {...props} />;
    }

    private select = (event: PointerEvent) => {
      if ((event.which && event.which !== 1) || !this.props.hovered) {
        return;
      }
      if (event.shiftKey && this.props.selected) {
        this.props.deselect(this.props.id);
        return;
      }

      if (!this.props.selected) {
        if (!event.shiftKey) {
          this.props.deselect();
        }

        this.props.select(this.props.id);
      }
    };
  }

  return enhance(Selectable);
};
