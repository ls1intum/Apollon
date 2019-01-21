import React, { SFC } from 'react';
import Element from './../../Element';

class ActionNode extends Element {
  constructor(public name: string = 'ActionNode') {
    super(name);
  }
}

export const ActionNodeComponent: SFC<Props> = ({ element }) => (
  <g>
    <rect rx={10} ry={10} width="100%" height="100%" stroke="black" />
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
      {element.name}
    </text>
  </g>
);

interface Props {
  element: ActionNode;
}

export default ActionNode;
