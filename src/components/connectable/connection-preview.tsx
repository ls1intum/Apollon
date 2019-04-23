import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Port } from '../../services/uml-element/port';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../utils/actions/actions';
import { Point } from '../../utils/geometry/point';
import { CoordinateSystem } from '../canvas/coordinate-system';
import { ModelState } from '../store/model-state';
import { UMLRelationshipPreview } from './uml-relationship-preview';

type OwnProps = {
  coordinateSystem: CoordinateSystem;
};

type StateProps = {
  connecting: Port[];
};

type DispatchProps = {
  end: AsyncDispatch<typeof UMLElementRepository.endConnecting>;
};

type Props = OwnProps & StateProps & DispatchProps;

const enhance = connect<StateProps, DispatchProps, OwnProps, ModelState>(
  state => ({
    connecting: state.connecting,
  }),
  {
    end: UMLElementRepository.endConnecting,
  },
);

const initialState = {
  position: null as Point | null,
};

type State = typeof initialState;

class Preview extends Component<Props, State> {
  state = initialState;

  componentDidUpdate(prevProps: Props) {
    if (this.props.connecting.length && prevProps.connecting !== this.props.connecting) {
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp, { once: true });
    }
  }

  componentWillUnmount() {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }

  render() {
    const { connecting } = this.props;
    const { position } = this.state;
    if (!connecting.length || !position) {
      return null;
    }

    return connecting.map((port, index) => <UMLRelationshipPreview key={index} port={port} target={position} />);
  }

  onPointerMove = (event: PointerEvent) => {
    const offset = this.props.coordinateSystem.offset();
    const position = new Point(event.clientX - offset.x, event.clientY - offset.y);
    this.setState({ position });
  };

  onPointerUp = (event: PointerEvent) => {
    document.removeEventListener('pointermove', this.onPointerMove);
    this.setState(initialState);
    this.props.end();
  };
}

export const ConnectionPreview = enhance(Preview);
