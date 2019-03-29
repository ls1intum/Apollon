import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Element } from '../../services/element/element';
import { ElementRepository } from '../../services/element/element-repository';
import { Port } from '../../services/element/port';
import { Direction } from '../../typings';
import { Point } from '../../utils/geometry/point';
import { CanvasContext, withCanvas } from '../canvas/canvas-context';
import { ModelState } from '../store/model-state';

class RelationshipPreviewComponent extends Component<Props, State> {
  state: State = {
    offset: new Point(0, 0),
    position: null,
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.port === this.props.port) return;

    if (this.props.port) {
      const offset = this.props.coordinateSystem.offset();
      this.setState({ offset });
      document.addEventListener('mousemove', this.onMouseMove);
    } else {
      document.removeEventListener('mousemove', this.onMouseMove);
      this.setState({ position: null, offset: new Point(0, 0) });
    }
  }

  render() {
    if (!this.props.port) return null;
    const points = this.calculatePath()
      .map(p => this.props.coordinateSystem.pointToScreen(p.x, p.y))
      .map(p => `${p.x} ${p.y}`)
      .join(', ');
    return <polyline points={points} pointerEvents="none" fill="none" stroke="black" strokeWidth="1" strokeDasharray="5,5" />;
  }

  private onMouseMove = (event: MouseEvent) => {
    let { x, y } = this.props.coordinateSystem.screenToPoint(event.clientX, event.clientY, false);
    x -= this.state.offset.x;
    y -= this.state.offset.y;
    this.setState({ position: new Point(x, y) });
  };

  private calculatePath = (): Point[] => {
    let path: Point[] = [];
    if (this.props.port) {
      const { element: id, direction: location } = this.props.port;
      const element = this.props.getById(id);
      if (!element) return [];
      switch (location) {
        case Direction.Up:
          path.push(new Point(element.bounds.x + element.bounds.width / 2, element.bounds.y));
          path.push(new Point(element.bounds.x + element.bounds.width / 2, element.bounds.y - 20));
          break;
        case Direction.Right:
          path.push(new Point(element.bounds.x + element.bounds.width, element.bounds.y + element.bounds.height / 2));
          path.push(new Point(element.bounds.x + element.bounds.width + 20, element.bounds.y + element.bounds.height / 2));
          break;
        case Direction.Down:
          path.push(new Point(element.bounds.x + element.bounds.width / 2, element.bounds.y + element.bounds.height));
          path.push(new Point(element.bounds.x + element.bounds.width / 2, element.bounds.y + element.bounds.height + 20));
          break;
        case Direction.Left:
          path.push(new Point(element.bounds.x, element.bounds.y + element.bounds.height / 2));
          path.push(new Point(element.bounds.x - 20, element.bounds.y + element.bounds.height / 2));
          break;
      }

      let ownerID = element.owner;
      while (ownerID) {
        const owner = this.props.getById(ownerID);
        if (!owner) break;
        path = path.map(({ x, y }) => new Point(x + owner.bounds.x, y + owner.bounds.y));
        ownerID = owner.owner;
      }
    }
    if (this.state.position) {
      path.push(this.state.position);
    }
    return path;
  };
}

type OwnProps = {
  port: Port | null;
};

type StateProps = {
  getById: (id: string) => Element | null;
};

type Props = OwnProps & StateProps & CanvasContext;

type State = {
  offset: Point;
  position: Point | null;
};

const enhance = compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect(
    (state: ModelState): StateProps => ({
      getById: ElementRepository.getById(state.elements),
    }),
  ),
);

export const RelationshipPreview = enhance(RelationshipPreviewComponent);
