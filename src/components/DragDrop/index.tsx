import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

const DragDrop = (props: Props) => <>{props.children}</>;

interface Props {
  children: React.ReactChild;
}

export default DragDropContext(HTML5Backend)(DragDrop);
