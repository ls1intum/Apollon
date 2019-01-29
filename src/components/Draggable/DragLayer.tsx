import React from 'react';
import { findDOMNode } from 'react-dom';
import { Provider as ContextProvider, Context } from './Context';
import Draggable from './Draggable';
import DropEvent from './DropEvent';
import Ghost from './Ghost';
import { Droppable } from './Droppable';

class DragLayer extends React.Component<Props, State> {
  state: State = {
    focused: false,
    dragging: false,
    element: null,
    offset: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
  };

  componentDidMount() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.cancel);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.cancel);
  }

  onMouseDown = (element: Draggable) => (event: MouseEvent) => {
    if (event.button != 0) return;

    const node = event.currentTarget as HTMLElement;
    const bounds = node.getBoundingClientRect();
    const container = findDOMNode(this) as HTMLElement;
    const bodyRect = document.body.getBoundingClientRect();
    const elemRect = container.getBoundingClientRect();
    const offset = {
      x: event.clientX - bounds.left + (elemRect.left - bodyRect.left),
      y: event.clientY - bounds.top + (elemRect.top - bodyRect.top),
    };

    this.setState({
      focused: true,
      offset,
      element,
    });
  };

  onMouseMove = (event: MouseEvent) => {
    if (!this.state.focused) return;

    const position = {
      x: event.pageX - this.state.offset.x,
      y: event.pageY - this.state.offset.y,
    };
    this.setState({
      dragging: true,
      position,
    });
  };

  onMouseUp = (element: Droppable) => (event: MouseEvent) => {
    if (!this.state.dragging || !this.state.element) return;
    event.stopPropagation();

    const customEvent: DropEvent = {
      position: {
        x: event.clientX - this.state.offset.x,
        y: event.clientY - this.state.offset.y,
      },
      element: this.state.element,
      action: null,
    };
    this.state.element.onDrop(customEvent);
    element.onDrop(customEvent);
    this.cancel();
  };

  cancel = () => {
    this.setState({
      focused: false,
      dragging: false,
      element: null,
    });
  };

  render() {
    const context: Context = {
      onMouseDown: this.onMouseDown,
      onMouseUp: this.onMouseUp,
    };
    let { x, y } = this.state.position;
    // x -= this.state.offset.x;
    // y -= this.state.offset.y;
    return (
      <ContextProvider value={context}>
        {this.props.children}
        {this.state.dragging && <Ghost x={x} y={y} />}
      </ContextProvider>
    );
  }
}

interface Props {}

interface State {
  focused: boolean;
  dragging: boolean;
  element: Draggable | null;
  offset: { x: number; y: number };
  position: { x: number; y: number };
}

export default DragLayer;
