import React, { Component } from 'react';
import styled from 'styled-components';
import Element from './../../Element';
import Boundary from '../../geo/Boundary';
import Attribute from './Attribute';

class Interface extends Element {
  bounds: Boundary = { ...this.bounds, height: 80 };

  constructor(public name: string = 'Interface') {
    super(name);

    const method1 = new Attribute('method1()');
    method1.bounds.y = 50;
    method1.owner = this;
    this.ownedElements = [method1];
  }
}

const Background = styled.rect``;

const Container = styled.svg`
  overflow: visible;

  ${Background} {
    fill: ${({ theme }) => theme.background || 'white'};
  }
`;

export class InterfaceComponent extends Component<Props> {
  render() {
    const { element, children } = this.props;
    const { width, height } = element.bounds;
    return (
      <Container width={width} height={height}>
        <Background width={width} height={height} stroke="black" />
        <svg width={width} height={50}>
          <g transform="translate(0, -1)">
            <rect y="100%" width="100%" height="1" fill="black" />
          </g>
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
            <tspan x="50%" dy={-8} textAnchor="middle" fontSize="85%">
              «interface»
            </tspan>
            <tspan x="50%" dy={18} textAnchor="middle">
              {element.name}
            </tspan>
          </text>
        </svg>
        <rect x="0" y={49} width="100%" height="1" fill="black" />

        {children}
      </Container>
    );
  }
}

interface Props {
  element: Interface;
}

export default Interface;
