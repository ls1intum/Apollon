import React, { Component } from 'react';
import { Point } from './../../domain/geo';
import Port from './../../domain/Port';
import { withCanvas, CanvasContext } from '../Canvas';

class RelationshipPreview extends Component<Props, State> {
  state: State = {
    offset: { x: 0, y: 0 },
    position: null,
  };

  private onMouseMove = (event: MouseEvent) => {
    let { x, y } = this.props.coordinateSystem.screenToPoint(
      event.clientX,
      event.clientY,
      false
    );
    x -= this.state.offset.x;
    y -= this.state.offset.y;
    this.setState({ position: { x, y } });
  };

  private calculatePath = (): Point[] => {
    const path: Point[] = [];
    if (this.props.port) {
      const { element, location } = this.props.port;
      switch (location) {
        case 'N':
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y,
          });
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y - 20,
          });
          break;
        case 'E':
          path.push({
            x: element.bounds.x + element.bounds.width,
            y: element.bounds.y + element.bounds.height / 2,
          });
          path.push({
            x: element.bounds.x + element.bounds.width + 20,
            y: element.bounds.y + element.bounds.height / 2,
          });
          break;
        case 'S':
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y + element.bounds.height,
          });
          path.push({
            x: element.bounds.x + element.bounds.width / 2,
            y: element.bounds.y + element.bounds.height + 20,
          });
          break;
        case 'W':
          path.push({
            x: element.bounds.x,
            y: element.bounds.y + element.bounds.height / 2,
          });
          path.push({
            x: element.bounds.x - 20,
            y: element.bounds.y + element.bounds.height / 2,
          });
          break;
      }
    }
    if (this.state.position) {
      path.push(this.state.position);
    }
    return path;
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.port === this.props.port) return;

    if (this.props.port) {
      const offset = this.props.coordinateSystem.offset();
      this.setState({ offset });
      document.addEventListener('mousemove', this.onMouseMove);
    } else {
      document.removeEventListener('mousemove', this.onMouseMove);
      this.setState({ position: null, offset: { x: 0, y: 0 } });
    }
  }

  render() {
    if (!this.props.port) return null;
    const points = this.calculatePath()
      .map(p => this.props.coordinateSystem.pointToScreen(p.x, p.y))
      .map(p => `${p.x} ${p.y}`)
      .join(', ');
    return (
      <polyline
        points={points}
        pointerEvents="none"
        fill="none"
        stroke="black"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );
  }
}

interface OwnProps {
  port: Port | null;
}

type Props = OwnProps & CanvasContext;

interface State {
  offset: Point;
  position: Point | null;
}

export default withCanvas(RelationshipPreview);
