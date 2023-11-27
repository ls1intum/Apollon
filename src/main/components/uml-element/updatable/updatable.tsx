import React, { Component, ComponentType } from 'react';
import { findDOMNode } from 'react-dom';
import { connect, ConnectedComponent } from 'react-redux';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { ModelState } from '../../store/model-state';
import { UMLElementComponentProps } from '../uml-element-component-props';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { FloatingButton } from './FloatingButton';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';

const FAB_TIMEOUT = 500;

const initialState = {
  showActionButtons: false,
};

type StateProps = {
  hovered: boolean;
  selected: boolean;
};

type DispatchProps = {
  updateStart: AsyncDispatch<typeof UMLElementRepository.updateStart>;
  delete: AsyncDispatch<typeof UMLElementRepository.delete>;
  getById: (id: string) => UMLElement | null;
};

type Props = UMLElementComponentProps & StateProps & DispatchProps;

type State = typeof initialState;

const enhance = connect<StateProps, DispatchProps, UMLElementComponentProps, ModelState>(
  (state, props) => ({
    hovered: state.hovered[0] === props.id,
    selected: state.selected.includes(props.id),
  }),
  {
    updateStart: UMLElementRepository.updateStart,
    delete: UMLElementRepository.delete,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  },
);

export const updatable = (
  WrappedComponent: ComponentType<UMLElementComponentProps>,
): ConnectedComponent<ComponentType<Props>, UMLElementComponentProps> => {
  class Updatable extends Component<Props, State> {
    state = initialState;

    timer: ReturnType<typeof setTimeout> | null = null;

    componentDidMount() {
      const node = findDOMNode(this) as HTMLElement;
      node.addEventListener('dblclick', this.onStartUpdate);
    }

    componentWillUnmount() {
      const node = findDOMNode(this) as HTMLElement;
      node.removeEventListener('dblclick', this.onStartUpdate);
    }

    render() {
      const { updateStart, getById, hovered, selected, ...props } = this.props;

      const element = getById(props.id);

      // We wait a few milliseconds before hiding the float action buttons
      // to prevent the actions from being hidden un
      if (!this.state.showActionButtons && (hovered || selected)) {
        this.setState({ ...this.state, showActionButtons: true });

        if (this.timer) {
          clearTimeout(this.timer);
        }
      }

      if (this.state.showActionButtons && !(hovered || selected)) {
        this.timer = setTimeout(() => {
          this.setState({ ...this.state, showActionButtons: false });
        }, FAB_TIMEOUT);
      }

      const shouldRenderFABs = element && !UMLRelationship.isUMLRelationship(element);

      return (
        <WrappedComponent {...props}>
          {shouldRenderFABs && (
            <FloatingButton
              style={{
                opacity: this.state.showActionButtons ? 1 : 0,
                transform: `translate(${element.bounds.width}px, ${this.state.showActionButtons ? -40 : -30}px)`,
              }}
              onClick={this.onStartUpdate}
            >
              <EditIcon x={7} y={7} />
            </FloatingButton>
          )}
          {shouldRenderFABs && (
            <FloatingButton
              style={{
                opacity: this.state.showActionButtons ? 1 : 0,
                transform: `translate(${element.bounds.width}px, ${this.state.showActionButtons ? -80 : -30}px)`,
              }}
              onClick={this.onDelete}
            >
              <DeleteIcon x={7} y={7} />
            </FloatingButton>
          )}
        </WrappedComponent>
      );
    }

    /**
     * Show the update dialog of the wrapped element
     */
    private onStartUpdate = () => {
      this.props.updateStart(this.props.id);
    };

    /**
     * Show the delete dialog of the wrapped element
     */
    private onDelete = () => {
      this.props.delete(this.props.id);
    };
  }

  return enhance(Updatable);
};
