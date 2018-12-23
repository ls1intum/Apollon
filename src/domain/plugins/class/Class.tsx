import React, { Component } from 'react';
import styled from 'styled-components';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';
import Attribute from './Attribute';

class Class extends Element {
  bounds: Boundary = { ...this.bounds, height: 95 };
  isAbstract: boolean = false;

  constructor(public name: string = 'Class') {
    super(name);

    const attribute1 = new Attribute('Case1');
    attribute1.bounds.y = 35;
    attribute1.owner = this;
    const method1 = new Attribute('Case2');
    method1.bounds.y = 65;
    method1.owner = this;
    this.ownedElements = [attribute1, method1];
  }
}

const Background = styled.rect``;

const Container = styled.svg`
  overflow: visible;

  ${Background} {
    fill: ${({ theme }) => theme.background || 'white'};
  }
`;

export class ClassComponent extends Component<Props> {
  render() {
    const { element, children } = this.props;
    const { width, height } = element.bounds;
    return (
      <Container width={width} height={height}>
        <Background width={width} height={height} stroke="black" />
        <svg width={width} height={35}>
          <g transform="translate(0, -1)">
            <rect x="0" y="100%" width="100%" height="1" fill="black" />
          </g>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontStyle={element.isAbstract ? 'italic' : 'normal'}>
            {element.name}
          </text>
        </svg>
        <rect x="0" y={64} width="100%" height="1" fill="black" />

        {children}
      </Container>
    );
  }
}

interface Props {
  element: Class;
}

export default Class;
