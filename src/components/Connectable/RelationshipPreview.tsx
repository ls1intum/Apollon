import React, { Component, RefObject } from 'react';
import { Point } from './../../domain/geo';
import Port from './../../domain/Port';

class RelationshipPreview extends Component<Props, State> {
  state: State = {
    position: null,
  };

  private onMouseMove = (event: MouseEvent) => {
    const container = this.props.canvas.current!.parentElement!;
    const bounds = container.getBoundingClientRect();
    this.setState({
      position: {
        x: event.clientX - bounds.left + container.scrollLeft,
        y: event.clientY - bounds.top + container.scrollTop,
      },
    });
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
      document.addEventListener('mousemove', this.onMouseMove);
    } else {
      document.removeEventListener('mousemove', this.onMouseMove);
      this.setState({ position: null });
    }
  }

  render() {
    if (!this.props.port) return null;
    const points = this.calculatePath()
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
  canvas: RefObject<HTMLDivElement>;
}

type Props = OwnProps;

interface State {
  position: Point | null;
}

export default RelationshipPreview;
