import React from 'react';
import DropEvent from './DropEvent';
import { withCanvas, CanvasContext } from './../Canvas';
import { Consumer } from './Context';

export class Droppable extends React.Component<Props> {
  onDrop = (event: DropEvent) => {
    const offset = this.props.coordinateSystem.offset();
    const position = this.props.coordinateSystem.screenToPoint(event.position.x, event.position.y);
    event.position = { x: position.x - offset.x, y: position.y - offset.y };

    event.element && event.element.onDrop(event);
    this.props.onDrop && this.props.onDrop(event);
  };

  render() {
    return (
      <Consumer
        children={context =>
          context &&
          React.cloneElement(this.props.children, {
            onMouseUp: context.onMouseUp(this),
          })
        }
      />
    );
  }
}

interface OwnProps {
  children: React.ReactElement<any>;
  onDrop?: (event: DropEvent) => void;
}

type Props = OwnProps & CanvasContext;

export default withCanvas(Droppable);
