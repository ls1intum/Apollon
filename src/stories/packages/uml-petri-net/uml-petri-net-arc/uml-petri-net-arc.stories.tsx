import { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { UMLPetriNetArc } from '../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc';
import {
  Props,
  UMLPetriNetArcComponent,
} from '../../../../main/packages/uml-petri-net/uml-petri-net-arc/uml-petri-net-arc-component';

export default {
  title: 'Packages/UML Petri Net/UML Petri Net Arc',
  component: UMLPetriNetArcComponent,
  args: { isSvg: true },
} as Meta;

const Template: Story<Props> = (args) => <UMLPetriNetArcComponent {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  element: new UMLPetriNetArc({
    bounds: { x: 0, y: 0, width: 200, height: 100 },
    // path: [new Point(50, 80), new Point(100, 150)],
    id: '1',
    name: 'UML Petri Net Arc',
    owner: null,
  }),
};
