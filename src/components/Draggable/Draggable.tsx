import React from 'react';
import { Consumer } from './Context';
import DropEvent from './DropEvent';

class Draggable extends React.Component<Props> {
  onDrop = (event: DropEvent) => this.props.onDrop && this.props.onDrop(event);

  render() {
    return (
      <Consumer
        children={context =>
          context &&
          React.cloneElement(this.props.children, {
            onMouseDown: context.onMouseDown(this),
          })
        }
      />
    );
  }
}

interface Props {
  children: React.ReactElement<any>;
  onDrop?: (event: DropEvent) => void;
}

export default Draggable;
