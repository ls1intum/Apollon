import React from 'react';
import { findDOMNode } from 'react-dom';
import DropEvent from './DropEvent';
import { Consumer, Context } from './Context';

export class Droppable extends React.Component<Props> {
  context: Context | null = null;

  onDrop = (event: DropEvent) => this.props.onDrop && this.props.onDrop(event);

  componentDidMount() {
    const node = findDOMNode(this) as HTMLElement;
    node.addEventListener('mouseup', this.context!.onMouseUp(this));
  }

  componentWillUnmount() {
    const node = findDOMNode(this) as HTMLElement;
    node.removeEventListener('mouseup', this.context!.onMouseUp(this));
  }

  render() {
    return (
      <Consumer
        children={context => {
          this.context = context;
          return context && this.props.children;
        }}
      />
    );
  }
}

interface OwnProps {
  children: React.ReactElement<any>;
  onDrop?: (event: DropEvent) => void;
}

type Props = OwnProps;

export default Droppable;
