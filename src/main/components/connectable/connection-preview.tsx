import React, { Component, ComponentType } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { IUMLElementPort } from '../../services/uml-element/uml-element-port.js';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository.js';
import { IUMLRelationship } from '../../services/uml-relationship/uml-relationship.js';
import { UMLRelationshipRepository } from '../../services/uml-relationship/uml-relationship-repository.js';
import { AsyncDispatch } from '../../utils/actions/actions.js';
import { Point } from '../../utils/geometry/point.js';
import { CanvasContext } from '../canvas/canvas-context.js';
import { withCanvas } from '../canvas/with-canvas.js';
import { ModelState } from '../store/model-state.js';
import { UMLRelationshipPreview } from './uml-relationship-preview.js';
import isMobile from 'is-mobile';

type OwnProps = {};

type StateProps = {
  connecting: IUMLElementPort[];
};

type DispatchProps = {
  endConnecting: AsyncDispatch<typeof UMLElementRepository.endConnecting>;
  endReconnecting: AsyncDispatch<typeof UMLRelationshipRepository.endReconnecting>;
};

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

const enhance = compose<ComponentType<OwnProps>>(
  withCanvas,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      connecting: [
        ...state.connecting,
        ...Object.keys(state.reconnecting).map(
          (id) => (state.elements[id] as IUMLRelationship)[state.reconnecting[id]],
        ),
      ],
    }),
    {
      endConnecting: UMLElementRepository.endConnecting,
      endReconnecting: UMLRelationshipRepository.endReconnecting,
    },
  ),
);

const initialState = {
  position: null as Point | null,
};

type State = typeof initialState;

class Preview extends Component<Props, State> {
  state = initialState;

  componentDidUpdate(prevProps: Props) {
    if (this.props.connecting.length && prevProps.connecting !== this.props.connecting) {
      if (isMobile({ tablet: true })) {
        document.addEventListener('touchmove', this.onPointerMove);
        document.addEventListener('touchend', this.onPointerUp, { once: true });
      } else {
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp, { once: true });
      }
    }
  }

  componentWillUnmount() {
    if (isMobile({ tablet: true })) {
      document.removeEventListener('touchmove', this.onPointerMove);
      document.removeEventListener('touchend', this.onPointerUp);
    } else {
      document.removeEventListener('pointermove', this.onPointerMove);
      document.removeEventListener('pointerup', this.onPointerUp);
    }
  }

  render() {
    const { connecting } = this.props;
    const { position } = this.state;
    if (!connecting.length || !position) {
      return null;
    }

    return connecting.map((port, index) => <UMLRelationshipPreview key={index} port={port} target={position} />);
  }

  onPointerMove = (event: PointerEvent | TouchEvent) => {
    const offset = this.props.canvas.origin();
    let position: Point;
    if (event instanceof PointerEvent) {
      position = new Point(event.clientX - offset.x, event.clientY - offset.y);
    } else {
      position = new Point(event.targetTouches[0].clientX - offset.x, event.targetTouches[0].clientY - offset.y);
    }
    this.setState({ position });
  };

  onPointerUp = (event: PointerEvent | TouchEvent) => {
    if (isMobile({ tablet: true })) {
      document.removeEventListener('touchend', this.onPointerMove);
    } else {
      document.removeEventListener('pointermove', this.onPointerMove);
    }
    this.setState(initialState);
    this.props.endConnecting();
    this.props.endReconnecting();
  };
}

export const ConnectionPreview = enhance(Preview);
